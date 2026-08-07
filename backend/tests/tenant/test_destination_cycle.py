"""El ciclo completo de destino, por HTTP (Fase 22, task 13).

Los tests de las tareas anteriores prueban cada servicio por separado. Este
recorre el camino entero como lo recorre la operación —hito, llegada, recepción,
incidencia, merma, ficha pública— y a través de la API, con sus permisos y su
serialización puestos.

Existe porque los errores de integración no viven dentro de un servicio: viven
en la costura entre dos. Un `outcome` que el servicio acepta y el schema
rechaza, o un permiso correcto en la capa equivocada, solo aparecen aquí.
"""

import pytest


def _dispatched_shipment(world):
    """Arma la cadena caja → tarima → envío que existe después de despachar.

    El mundo compartido las siembra sueltas, y encadenarlas ahí rompería a los
    demás tests que cuentan con esa forma.
    """
    envio = world.a["shipment"].id
    world.a["pallet"].shipment_id = envio
    world.a["pallet"].status = "SHIPPED"
    world.a["box"].pallet_id = world.a["pallet"].id
    world.a["box"].status = "SHIPPED"
    world.a["shipment"].status = "SHIPPED"
    world.db.commit()
    return envio


def _prepare_delivered_shipment(world, client):
    """Deja el envío de A en DELIVERED, que es el punto de partida de la recepción."""
    envio = _dispatched_shipment(world)
    admin = world.token(world.admin)

    hito = client.post(f"/v1/shipments/{envio}/milestones",
                       json={"milestone": "LOADED_AIRCRAFT", "note": "vuelo AV-234"},
                       headers=admin)
    assert hito.status_code == 200

    llegada = client.post(f"/v1/shipments/{envio}/delivered", json={}, headers=admin)
    assert llegada.status_code == 200
    assert llegada.json()["status"] == "DELIVERED"
    return envio, admin


class TestDestinationCycle:

    def test_the_whole_cycle_runs_end_to_end(self, client, world):
        envio, admin = _prepare_delivered_shipment(world, client)
        caja = world.a["box"]

        # La recepción marca solo la excepción; el resto se da por recibido.
        recepcion = client.post(
            f"/v1/shipments/{envio}/reception",
            json={
                "exceptions": [{"box_id": str(caja.id), "outcome": "DAMAGED",
                                "note": "caja mojada"}],
                "pallet_weights": [],
                "consignee_name": "Fundación de destino",
            },
            headers=admin,
        )
        assert recepcion.status_code == 201
        cuerpo = recepcion.json()
        assert cuerpo["shrinkage"]["not_received"] == 1
        assert cuerpo["consignee_name"] == "Fundación de destino"

        # El envío quedó reconciliado.
        detalle = client.get(f"/v1/shipments/{envio}", headers=admin)
        assert detalle.json()["status"] == "RECONCILED"

        # La excepción abrió su incidencia, visible en la bandeja.
        bandeja = client.get("/v1/incidents?status=OPEN", headers=admin)
        assert bandeja.status_code == 200
        tipos = {i["type"] for i in bandeja.json()}
        assert "DAMAGE" in tipos

        # Y se cierra con nota, que es lo que la vuelve resolución y no archivo.
        incidencia = next(i for i in bandeja.json() if i["type"] == "DAMAGE")
        cierre = client.post(f"/v1/incidents/{incidencia['id']}/resolve",
                             json={"note": "Reembolsada por el seguro"}, headers=admin)
        assert cierre.status_code == 200
        assert cierre.json()["status"] == "RESOLVED"

    def test_the_dispatched_inventory_survives_the_whole_cycle(self, client, world):
        """El invariante de la fase, comprobado al final del camino y no a mitad."""
        envio, admin = _prepare_delivered_shipment(world, client)
        caja = world.a["box"]

        client.post(f"/v1/shipments/{envio}/reception",
                    json={"exceptions": [{"box_id": str(caja.id), "outcome": "MISSING"}],
                          "pallet_weights": []},
                    headers=admin)

        world.db.refresh(caja)
        world.db.refresh(world.a["pallet"])
        assert caja.status == "SHIPPED"
        assert world.a["pallet"].status == "SHIPPED"

    def test_a_reception_cannot_be_recorded_twice(self, client, world):
        envio, admin = _prepare_delivered_shipment(world, client)

        primera = client.post(f"/v1/shipments/{envio}/reception",
                              json={"exceptions": [], "pallet_weights": []}, headers=admin)
        segunda = client.post(f"/v1/shipments/{envio}/reception",
                              json={"exceptions": [], "pallet_weights": []}, headers=admin)

        assert primera.status_code == 201
        # Ya no está DELIVERED, así que la transición es lo que lo frena primero.
        assert segunda.status_code == 400

    def test_the_sending_center_reads_but_does_not_record(self, client, world):
        """El coordinador ve qué pasó con su carga; registrar es de la nacional."""
        envio, admin = _prepare_delivered_shipment(world, client)
        coord = world.token(world.coordinator_a)

        client.post(f"/v1/shipments/{envio}/reception",
                    json={"exceptions": [], "pallet_weights": []}, headers=admin)

        lectura = client.get(f"/v1/shipments/{envio}/reception", headers=coord)
        assert lectura.status_code == 200
        assert lectura.json()["shrinkage"]["not_received"] == 0

        intento = client.post(f"/v1/shipments/{envio}/milestones",
                              json={"milestone": "CUSTOMS_CLEARED"}, headers=coord)
        assert intento.status_code == 403

    def test_the_public_ficha_reports_the_delivery(self, client, world):
        """Quien escanea el QR ve que llegó, sin entrar al panel ni autenticarse.

        La bandera se enciende al marcar la entrega, no al reconciliar: quien
        pregunta en el andén quiere saber si llegó, no si ya la contaron.
        """
        envio = _dispatched_shipment(world)
        admin = world.token(world.admin)
        caja = world.a["box"]

        despachada = client.get(f"/v1/public/qr/{caja.code}")
        assert despachada.json()["delivered"] is False

        client.post(f"/v1/shipments/{envio}/delivered", json={}, headers=admin)

        entregada = client.get(f"/v1/public/qr/{caja.code}")
        assert entregada.status_code == 200
        assert entregada.json()["delivered"] is True

    @pytest.mark.parametrize("milestone", ["DEPARTED_WAREHOUSE", "CUSTOMS_CLEARED"])
    def test_milestones_never_move_the_status(self, client, world, milestone):
        envio, admin = _prepare_delivered_shipment(world, client)

        antes = client.get(f"/v1/shipments/{envio}", headers=admin).json()["status"]
        client.post(f"/v1/shipments/{envio}/milestones",
                    json={"milestone": milestone}, headers=admin)
        despues = client.get(f"/v1/shipments/{envio}", headers=admin).json()["status"]

        assert antes == despues == "DELIVERED"
