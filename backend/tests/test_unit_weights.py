"""Pesos de referencia del catálogo (Fase 21, task 3).

Estos números no pretenden exactitud: existen para que quien captura note un
dedazo, comparando órdenes de magnitud. Lo que sí tienen que cumplir es no
mentir de forma estructural — un nombre que no existe en el catálogo no sirve de
nada, y un peso absurdo convertiría la ayuda en ruido.
"""

import pytest

from app.seeds.common_food import FOOD
from app.seeds.iom_nonfood import NONFOOD
from app.seeds.unit_weights import ALL_WEIGHTS, FOOD_WEIGHTS, NONFOOD_WEIGHTS

_CATALOGO = {r["display_name"] for r in FOOD} | {r["display_name"] for r in NONFOOD}


def test_todo_peso_apunta_a_un_producto_que_existe():
    """Un nombre mal escrito aquí es un peso que nunca se aplica y nadie nota."""
    huerfanos = set(ALL_WEIGHTS) - _CATALOGO
    assert huerfanos == set(), f"nombres que no están en el catálogo: {sorted(huerfanos)}"


def test_los_pesos_de_alimentos_son_de_alimentos():
    nombres = {r["display_name"] for r in FOOD}
    assert set(FOOD_WEIGHTS) <= nombres


def test_los_pesos_no_alimentarios_son_de_higiene_o_agua():
    nombres = {r["display_name"] for r in NONFOOD if r["category"] in ("HYGIENE", "WATER")}
    assert set(NONFOOD_WEIGHTS) <= nombres


@pytest.mark.parametrize("nombre,peso", sorted(ALL_WEIGHTS.items()))
def test_ningun_peso_es_absurdo(nombre, peso):
    """Entre 10 g y 20 kg por unidad. Fuera de ahí es un dedazo en el seed."""
    assert 0.01 <= peso <= 20, nombre


def test_lo_que_se_dona_por_kilo_pesa_un_kilo():
    """Si la unidad es el kilo, el peso unitario es 1 por definición."""
    por_kilo = {r["display_name"] for r in FOOD if r.get("default_unit") == "kg"}
    for nombre in por_kilo & set(FOOD_WEIGHTS):
        assert FOOD_WEIGHTS[nombre] == 1.0, nombre


def test_los_recipientes_de_agua_pesan_vacios():
    """Se donan vacíos: un bidón de 20 L no pesa 20 kg. Es el error más fácil
    de cometer, y el que más ensuciaría la referencia."""
    for nombre in ("Bidón plegable 20 L", "Balde con grifo 20 L", "Contenedor rígido de agua 10 L"):
        assert NONFOOD_WEIGHTS[nombre] < 5, nombre


def test_los_alimentos_mas_donados_tienen_referencia():
    """Sin estos, la mitad de las capturas reales se quedan sin ayuda."""
    for nombre in ("Arroz blanco", "Frijol negro", "Atún en lata", "Aceite vegetal",
                   "Leche en polvo", "Azúcar", "Pasta"):
        assert nombre in FOOD_WEIGHTS


# ── La migración que los aplica ──────────────────────────────────────────────

def test_la_migracion_solo_llena_lo_vacio():
    """Si un centro curó el peso de un producto, ese valor manda: el nuestro es
    un tamaño comercial típico, el suyo es su realidad."""
    from pathlib import Path

    src = Path("alembic/versions/037_seed_unit_weights.py").read_text()
    assert "unit_weight_kg IS NULL" in src


def test_la_migracion_revierte_solo_lo_que_sembro():
    from pathlib import Path

    src = Path("alembic/versions/037_seed_unit_weights.py").read_text()
    assert "unit_weight_kg = :peso" in src        # el downgrade compara antes de borrar


def test_la_migracion_cubre_todos_los_pesos_definidos():
    """Un peso en la tabla que la migración no aplique sería letra muerta."""
    import importlib.util
    from pathlib import Path

    ruta = Path("alembic/versions/037_seed_unit_weights.py")
    spec = importlib.util.spec_from_file_location("mig037", ruta)
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)

    assert len(mig._filas()) == len(ALL_WEIGHTS)
