"""Aislamiento entre centros del pre-registro de donaciones (Fase 18, task 18).

Se prueba desde la posición del atacante: el coordinador de B no debe ver las
donaciones de A, ni las que van en camino a A ni las que A ya recibió.

El detalle por código es la excepción **deliberada**: el donante elige un centro
al pre-registrarse pero puede acabar llevando su donación a otro, y el QR tiene
que funcionar donde de hecho llegue. Lo que sí queda fijado aquí es que recibir
estampa el centro de quien recibe, no el que el donante había elegido.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models.donation import Donation, DonationItem
from app.models.donor import Donor


def _sembrar(world, status: str, center_id, code: str) -> Donation:
    donor = Donor(
        donor_type="fisica", source="self", center_id=None,
        first_name="Quien", last_name="Dona", email=f"{code.lower()}@ejemplo.test",
        email_verified_at=datetime.now(timezone.utc),
    )
    world.db.add(donor)
    world.db.flush()

    donation = Donation(
        code=code,
        donor_id=donor.id,
        status=status,
        intended_center_id=center_id if status == "REGISTERED" else None,
        received_center_id=center_id if status == "RECEIVED" else None,
        registered_at=datetime.now(timezone.utc),
        manage_token_hash="hash" + code,
        manage_token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    world.db.add(donation)
    world.db.flush()
    world.db.add(DonationItem(
        donation_id=donation.id, free_text="20 latas de atún",
        quantity=20, unit="latas", added_by="donor",
    ))
    world.db.commit()
    return donation


def test_b_no_ve_las_donaciones_recibidas_por_a(world, client):
    _sembrar(world, "RECEIVED", world.center_a.id, "DN-RECIBIDAA")

    r = client.get("/v1/donations", headers=world.token(world.coordinator_b))

    assert r.status_code == 200
    assert r.json() == []


def test_b_no_ve_las_donaciones_en_camino_a_a(world, client):
    _sembrar(world, "REGISTERED", world.center_a.id, "DN-CAMINOAAA")

    r = client.get("/v1/donations?incoming=true", headers=world.token(world.coordinator_b))

    assert r.status_code == 200
    assert r.json() == []


def test_a_si_ve_lo_suyo(world, client):
    """El contrapunto: sin esto, un listado roto pasaría los tests de fuga."""
    _sembrar(world, "RECEIVED", world.center_a.id, "DN-RECIBIDAA")

    r = client.get("/v1/donations", headers=world.token(world.coordinator_a))

    assert [d["code"] for d in r.json()] == ["DN-RECIBIDAA"]


def test_el_admin_nacional_ve_los_dos_centros(world, client):
    _sembrar(world, "RECEIVED", world.center_a.id, "DN-RECIBIDAA")
    _sembrar(world, "RECEIVED", world.center_b.id, "DN-RECIBIDAB")

    r = client.get("/v1/donations", headers=world.token(world.admin))

    assert sorted(d["code"] for d in r.json()) == ["DN-RECIBIDAA", "DN-RECIBIDAB"]


def test_recibir_estampa_el_centro_de_quien_recibe(world, client):
    """El centro elegido por el donante era intención; manda quién la recibió."""
    donation = _sembrar(world, "REGISTERED", world.center_a.id, "DN-CAMINOAAA")

    r = client.post(
        f"/v1/donations/{donation.code}/receive",
        json={"results": {}, "extras": []},
        headers=world.token(world.coordinator_b),
    )

    assert r.status_code == 200
    assert r.json()["received_center_id"] == str(world.center_b.id)


def test_un_voluntario_no_recibe_a_nombre_de_otro_centro(world, client):
    """`center_id` en el cuerpo solo lo honra national_admin, que no tiene centro."""
    donation = _sembrar(world, "REGISTERED", world.center_a.id, "DN-CAMINOAAA")

    r = client.post(
        f"/v1/donations/{donation.code}/receive",
        json={"results": {}, "extras": [], "center_id": str(world.center_a.id)},
        headers=world.token(world.coordinator_b),
    )

    assert r.status_code == 200
    assert r.json()["received_center_id"] == str(world.center_b.id)


def test_la_ficha_publica_no_lleva_datos_del_donante(world, client):
    donation = _sembrar(world, "RECEIVED", world.center_a.id, "DN-RECIBIDAA")

    r = client.get(f"/v1/d/{donation.code}")

    assert r.status_code == 200
    cuerpo = r.text.lower()
    assert "quien" not in cuerpo and "ejemplo.test" not in cuerpo


def test_sin_sesion_no_hay_listado(world, client):
    _sembrar(world, "RECEIVED", world.center_a.id, "DN-RECIBIDAA")

    assert client.get("/v1/donations").status_code in (401, 403)


@pytest.mark.parametrize("code", ["DN-NOEXISTE1", "BX-AAAAA1", str(uuid.uuid4())])
def test_un_codigo_inventado_responde_404(world, client, code):
    """Misma respuesta para inexistente y para no confirmada: probar códigos no
    revela cuáles existen."""
    r = client.get(f"/v1/donations/{code}", headers=world.token(world.coordinator_b))
    assert r.status_code == 404
