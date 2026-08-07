"""Panel de gasto de IA (Fase 23, task 3).

El riesgo de la fase no es el precio unitario —una sugerencia cuesta centésimas
de centavo— sino el volumen sin control. Un bucle mal escrito no aparece en la
factura hasta fin de mes, y para entonces ya corrió treinta días. Lo que estos
tests fijan es que el panel diga las tres cosas que hacen falta para cacharlo a
tiempo: cuánto va del tope, en qué capacidad, y qué día se disparó.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


import app.models  # noqa: E402,F401

from app.models.ai_usage import AI_CAPABILITIES, AIUsage  # noqa: E402
from app.models.center import Center  # noqa: E402
from app.services.ai import budget, usage_report  # noqa: E402


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _usage(db, capability="text_mapping", cost=0.5, when=None, center_id=None):
    db.add(AIUsage(
        capability=capability,
        model="modelo-de-prueba",
        input_tokens=1000,
        output_tokens=200,
        cost_usd=cost,
        center_id=center_id,
        created_at=when or datetime.now(timezone.utc),
    ))
    db.commit()


def _center(db, name):
    center = Center(name=name, is_active=True)
    db.add(center)
    db.commit()
    return center


def test_every_capability_is_listed_even_with_no_calls(db):
    """Una capacidad apagada que no aparece se confunde con una encendida que
    nadie usó, y esas dos situaciones piden acciones opuestas."""
    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_text_mapping", True), \
         patch.object(budget.settings, "ai_enable_label_ocr", False):
        reporte = usage_report.build_report(db)

    listadas = {c["capability"]: c for c in reporte["capabilities"]}
    assert set(listadas) == set(AI_CAPABILITIES)
    assert listadas["text_mapping"]["enabled"] is True
    assert listadas["label_ocr"]["enabled"] is False
    assert listadas["label_ocr"]["calls"] == 0


def test_spend_is_broken_down_by_capability(db):
    """El total dice que hay un problema; la capacidad dice cuál apagar."""
    _usage(db, "text_mapping", cost=0.30)
    _usage(db, "text_mapping", cost=0.20)
    _usage(db, "label_ocr", cost=1.00)

    reporte = usage_report.build_report(db)
    por_capacidad = {c["capability"]: c for c in reporte["capabilities"]}

    assert por_capacidad["text_mapping"]["cost_usd"] == pytest.approx(0.50)
    assert por_capacidad["text_mapping"]["calls"] == 2
    assert por_capacidad["label_ocr"]["cost_usd"] == pytest.approx(1.00)
    assert reporte["month_spend_usd"] == pytest.approx(1.50)


def test_last_month_does_not_count_against_this_month(db):
    """El tope es mensual: arrastrar el mes pasado apagaría la IA sin motivo."""
    _usage(db, cost=5.0, when=usage_report.month_start() - timedelta(days=1))
    _usage(db, cost=0.25)

    assert usage_report.build_report(db)["month_spend_usd"] == pytest.approx(0.25)


def test_the_daily_series_separates_a_loop_from_normal_use(db):
    """Mil llamadas repartidas en un mes son uso; mil en una tarde son un bucle.
    El total no distingue esas dos cosas y el gráfico diario sí."""
    hoy = datetime.now(timezone.utc)
    _usage(db, cost=0.10, when=hoy - timedelta(days=2))
    _usage(db, cost=0.10, when=hoy)
    _usage(db, cost=0.10, when=hoy)

    diario = usage_report.build_report(db)["daily"]

    assert len(diario) == 2
    assert diario[-1]["calls"] == 2
    assert diario[-1]["cost_usd"] == pytest.approx(0.20)
    # Ordenado hacia adelante: un gráfico al revés se lee como la tendencia
    # contraria a la real.
    assert diario[0]["day"] < diario[-1]["day"]


def test_the_report_points_at_where_the_spend_came_from(db):
    """`center_id` se guarda para encontrar el origen de un pico. Si el panel no
    lo enseña, ese dato solo sirve consultando la base a mano."""
    grande = _center(db, "Centro Norte")
    chico = _center(db, "Centro Sur")
    _usage(db, cost=2.0, center_id=grande.id)
    _usage(db, cost=0.1, center_id=chico.id)

    top = usage_report.build_report(db)["top_centers"]

    assert [c["center_name"] for c in top] == ["Centro Norte", "Centro Sur"]
    assert top[0]["cost_usd"] == pytest.approx(2.0)


def test_a_provider_without_a_key_is_reported_as_such(db):
    """Sin llave toda capacidad está apagada aunque su bandera diga que sí.
    Decirlo evita el rato perdido buscando por qué 'está encendida' y no
    responde."""
    with patch.object(budget.settings, "ai_api_key", ""), \
         patch.object(budget.settings, "ai_enable_text_mapping", True):
        reporte = usage_report.build_report(db)

    assert reporte["provider_configured"] is False
    assert all(c["enabled"] is False for c in reporte["capabilities"])


def test_reaching_the_cap_shows_up_as_exhausted(db):
    with patch.object(budget.settings, "ai_monthly_budget_usd", 1.0):
        _usage(db, cost=1.5)
        assert usage_report.build_report(db)["budget_exhausted"] is True

    with patch.object(budget.settings, "ai_monthly_budget_usd", 10.0):
        assert usage_report.build_report(db)["budget_exhausted"] is False


def test_the_report_never_writes(db):
    """Es una lectura. Encender o apagar se hace en las variables de entorno: un
    panel que también pudiera cambiarlo sería una segunda fuente de verdad sobre
    el mismo interruptor."""
    _usage(db, cost=0.5)
    antes = db.query(AIUsage).count()

    usage_report.build_report(db)

    assert db.query(AIUsage).count() == antes
