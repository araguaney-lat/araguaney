"""Flujo feliz de transferencias y mensajería.

El resto de la suite de estos módulos prueba el aislamiento entre centros (que se
deniegue el acceso cruzado). Falta lo contrario: que el ciclo completo, hecho por
quien sí tiene permiso, funcione de principio a fin. Estas pruebas cubren eso.
"""


class TestTransferCycle:
    def test_full_cycle_moves_the_box_to_the_destination(self, client, world):
        box = world.a["box"]  # BX-AAAAA1, SEALED, en center_a

        created = client.post(
            "/v1/transfers",
            json={
                "from_center_id": str(world.center_a.id),
                "to_center_id": str(world.center_b.id),
                "box_ids": [str(box.id)],
            },
            headers=world.token(world.coordinator_a),
        )
        assert created.status_code == 201, created.text
        transfer_id = created.json()["id"]
        assert created.json()["status"] == "REQUESTED"
        assert created.json()["from_center_name"] == world.center_a.name
        assert created.json()["to_center_name"] == world.center_b.name

        # La coordinación del centro de origen aprueba y despacha.
        approved = client.post(
            f"/v1/transfers/{transfer_id}/approve",
            headers=world.token(world.coordinator_a),
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["status"] == "APPROVED"

        dispatched = client.post(
            f"/v1/transfers/{transfer_id}/dispatch",
            headers=world.token(world.coordinator_a),
        )
        assert dispatched.status_code == 200, dispatched.text
        assert dispatched.json()["status"] == "IN_TRANSIT"

        # La coordinación del centro de destino recibe.
        received = client.post(
            f"/v1/transfers/{transfer_id}/receive",
            headers=world.token(world.coordinator_b),
        )
        assert received.status_code == 200, received.text
        assert received.json()["status"] == "RECEIVED"

        # El efecto real: la caja quedó en el centro de destino.
        from app.models.box import Box
        world.db.expire_all()
        moved = world.db.get(Box, box.id)
        assert moved.center_id == world.center_b.id

    def test_reject_ends_the_transfer(self, client, world):
        box = world.a["box"]
        created = client.post(
            "/v1/transfers",
            json={
                "from_center_id": str(world.center_a.id),
                "to_center_id": str(world.center_b.id),
                "box_ids": [str(box.id)],
            },
            headers=world.token(world.coordinator_a),
        )
        assert created.status_code == 201, created.text
        transfer_id = created.json()["id"]

        rejected = client.post(
            f"/v1/transfers/{transfer_id}/reject",
            json={"reason": "No hace falta en destino"},
            headers=world.token(world.coordinator_a),
        )
        assert rejected.status_code == 200, rejected.text
        assert rejected.json()["status"] == "REJECTED"


class TestMessagingCycle:
    def test_public_thread_create_and_reply(self, client, world):
        created = client.post(
            "/v1/messages",
            json={
                "title": "Faltan tapabocas",
                "body": "¿Alguien tiene excedente?",
                "thread_type": "PUBLIC",
                "campaign_id": str(world.campaign.id),
            },
            headers=world.token(world.coordinator_a),
        )
        assert created.status_code == 201, created.text
        thread_id = created.json()["id"]

        reply = client.post(
            f"/v1/messages/{thread_id}/replies",
            json={"body": "Nosotros tenemos una caja"},
            headers=world.token(world.coordinator_b),
        )
        assert reply.status_code == 201, reply.text

        detail = client.get(
            f"/v1/messages/{thread_id}",
            headers=world.token(world.coordinator_a),
        )
        assert detail.status_code == 200, detail.text
        bodies = [r["body"] for r in detail.json()["replies"]]
        assert "Nosotros tenemos una caja" in bodies

    def test_private_thread_to_a_campaign_member(self, client, world):
        created = client.post(
            "/v1/messages",
            json={
                "title": "Coordinación de envío",
                "body": "Hablemos del próximo camión",
                "thread_type": "PRIVATE",
                "campaign_id": str(world.campaign.id),
                "recipient_ids": [str(world.coordinator_b.id)],
            },
            headers=world.token(world.coordinator_a),
        )
        assert created.status_code == 201, created.text

        # El destinatario lo ve; es participante.
        detail = client.get(
            f"/v1/messages/{created.json()['id']}",
            headers=world.token(world.coordinator_b),
        )
        assert detail.status_code == 200, detail.text
