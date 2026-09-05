"""Gestionar los alias de un producto desde el panel (Fase 28, task 7).

Un alias cambia lo que el catálogo encuentra para **todos** los centros, así
que se administra donde se administra el catálogo: la administración nacional.
Esta pantalla es además el prerrequisito de los alias aprendidos de la captura
(task 6) — algo que el sistema agrega solo tiene que poder verlo y deshacerlo
una persona antes de que empiece a agregarlo.
"""

from app.models.product_alias import ProductAlias


def _alias_url(pt_id, alias_id=None):
    base = f"/v1/product-types/{pt_id}/aliases"
    return base if alias_id is None else f"{base}/{alias_id}"


def test_the_national_admin_adds_an_alias(client, world):
    res = client.post(
        _alias_url(world.product_type.id),
        json={"alias": "pipa de agua"},
        headers=world.token(world.admin),
    )

    assert res.status_code == 201, res.text
    cuerpo = res.json()
    assert cuerpo["alias"] == "pipa de agua"
    # Nunca 'seed' ni 'learned': el origen lo pone el servidor, no quien llama.
    assert cuerpo["source"] == "manual"


def test_the_alias_is_then_listed(client, world):
    client.post(
        _alias_url(world.product_type.id),
        json={"alias": "pipa de agua"},
        headers=world.token(world.admin),
    )

    res = client.get(_alias_url(world.product_type.id), headers=world.token(world.coordinator_a))

    assert res.status_code == 200
    assert [a["alias"] for a in res.json()] == ["pipa de agua"]


def test_a_coordinator_cannot_add_one(client, world):
    """El catálogo es de todos los centros: un alias que agrega un centro
    cambiaría lo que encuentran los demás."""
    res = client.post(
        _alias_url(world.product_type.id),
        json={"alias": "pipa de agua"},
        headers=world.token(world.coordinator_a),
    )

    assert res.status_code == 403


def test_an_alias_the_catalogue_already_found_is_refused(client, world):
    """El producto se llama "Agua 1L", así que "agua" no agrega nada. No rompe
    tenerlo, pero hace creer que la lista cubre más de lo que cubre — la misma
    regla que vigila a los alias sembrados, aplicada en la frontera."""
    res = client.post(
        _alias_url(world.product_type.id),
        json={"alias": "agua"},
        headers=world.token(world.admin),
    )

    assert res.status_code == 400
    assert res.json()["error"]["code"] == "ALIAS_ALREADY_FOUND"


def test_the_same_alias_twice_is_refused(client, world):
    client.post(
        _alias_url(world.product_type.id),
        json={"alias": "pipa de agua"},
        headers=world.token(world.admin),
    )
    res = client.post(
        _alias_url(world.product_type.id),
        json={"alias": "  Pipa  de  Agua  "},
        headers=world.token(world.admin),
    )

    # Espacios de más y mayúsculas no lo hacen un alias distinto.
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "ALIAS_ALREADY_EXISTS"


def test_an_alias_with_nothing_in_it_is_refused(client, world):
    res = client.post(
        _alias_url(world.product_type.id),
        json={"alias": "de la"},
        headers=world.token(world.admin),
    )

    assert res.status_code == 400
    assert res.json()["error"]["code"] == "ALIAS_TOO_SHORT"


def test_the_national_admin_removes_an_alias(client, world):
    creado = client.post(
        _alias_url(world.product_type.id),
        json={"alias": "pipa de agua"},
        headers=world.token(world.admin),
    ).json()

    res = client.delete(
        _alias_url(world.product_type.id, creado["id"]), headers=world.token(world.admin)
    )

    assert res.status_code == 204
    listado = client.get(
        _alias_url(world.product_type.id), headers=world.token(world.admin)
    ).json()
    assert listado == []


def test_a_seeded_alias_can_be_removed_too(client, world):
    """Uno sembrado que resultó equivocado arrastra al producto equivocado en
    cada captura. Haber venido con el catálogo no lo hace más correcto."""
    fila = ProductAlias(
        product_type_id=world.product_type.id,
        alias="garrafon",
        normalized="garrafon",
        source="seed",
    )
    world.db.add(fila)
    world.db.commit()

    res = client.delete(
        _alias_url(world.product_type.id, fila.id), headers=world.token(world.admin)
    )

    assert res.status_code == 204


def test_an_alias_of_another_product_is_not_found_here(client, world):
    """La ruta declara a qué producto pertenece: responder 404 evita confirmar
    que el alias existe colgando de otro."""
    from app.models.product_type import ProductType

    otro = ProductType(display_name="Cobija de lana", category="OTHER")
    world.db.add(otro)
    world.db.flush()
    fila = ProductAlias(
        product_type_id=otro.id, alias="frazada", normalized="frazada", source="seed"
    )
    world.db.add(fila)
    world.db.commit()

    res = client.delete(
        _alias_url(world.product_type.id, fila.id), headers=world.token(world.admin)
    )

    assert res.status_code == 404


def test_adding_and_removing_leave_a_trace_in_the_audit_log(client, world):
    """El catálogo es de todos los centros, así que quién lo cambió importa."""
    from app.models.audit_log import AuditLog

    creado = client.post(
        _alias_url(world.product_type.id),
        json={"alias": "pipa de agua"},
        headers=world.token(world.admin),
    ).json()
    client.delete(
        _alias_url(world.product_type.id, creado["id"]), headers=world.token(world.admin)
    )

    acciones = [a.action for a in world.db.query(AuditLog).all()]
    assert "PRODUCT_ALIAS_ADDED" in acciones
    assert "PRODUCT_ALIAS_REMOVED" in acciones
