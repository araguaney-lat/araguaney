"""Otro nombre para el mismo producto (Fase 28).

La medición del mapeo dejó tres fallos que ninguna mejora de búsqueda alcanza:
"frazadas", "acetaminofén" y "advil" no comparten una letra con la entrada del
catálogo a la que corresponden. No es un problema de búsqueda — es que al
producto le falta el nombre por el que esa persona lo pidió.

Lo que estas pruebas fijan no es que existan alias, sino que **los dos**
consumidores del catálogo los usen: el shortlist que alimenta a la IA y el
buscador que usan el panel y la aplicación. Si solo uno los mirara, teclear
"frazadas" encontraría el producto por un camino y no por el otro, y quien
captura sufriría una incoherencia que nadie puede explicarle.
"""

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


import app.models  # noqa: E402,F401
from app.database import Base  # noqa: E402
from app.models.product_alias import ProductAlias  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.repositories.product_type_repository import ProductTypeRepository  # noqa: E402
from app.services.ai.text_mapping import _catalog_words, _shortlist  # noqa: E402
from app.utils.text_matching import shares_stem, words  # noqa: E402


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


def _product(db, display_name, **kwargs):
    pt = ProductType(
        id=uuid.uuid4(), category=kwargs.pop("category", "OTHER"),
        display_name=display_name, campaign_id=None, **kwargs,
    )
    db.add(pt)
    db.commit()
    return pt


def _alias(db, pt, alias, source="seed"):
    from app.utils.text_matching import normalize

    db.add(
        ProductAlias(
            id=uuid.uuid4(), product_type_id=pt.id, alias=alias,
            normalized=normalize(alias), source=source,
        )
    )
    db.commit()


# ── El shortlist de la IA ────────────────────────────────────────────────────


def test_an_alias_brings_a_product_the_words_never_would(db):
    """"Frazada" no comparte una letra con "Cobija de lana". Sin el alias el
    modelo nunca ve el producto correcto, y entonces su lista vacía es la
    respuesta correcta a una pregunta mal hecha."""
    cobija = _product(db, "Cobija de lana")

    assert _shortlist(db, "10 frazadas", None) == []

    _alias(db, cobija, "frazada")
    assert [pt.id for pt in _shortlist(db, "10 frazadas", None)] == [cobija.id]


def test_the_alias_matches_in_plural_too(db):
    """La misma regla de plurales que el resto: quien captura escribe "frazadas"
    y el alias está guardado en singular."""
    cobija = _product(db, "Cobija de lana")
    _alias(db, cobija, "frazada")

    assert [pt.id for pt in _shortlist(db, "frazadas nuevas", None)] == [cobija.id]


def test_the_alias_matches_without_its_accent(db):
    """"Acetaminofén" con acento en el catálogo, sin acento al teclear con
    prisa: es la misma normalización que ya corre sobre todo lo demás."""
    paracetamol = _product(db, "Paracetamol 500mg tableta", category="MEDICINE")
    _alias(db, paracetamol, "acetaminofén")

    assert [pt.id for pt in _shortlist(db, "acetaminofen 500", None)] == [paracetamol.id]


def test_the_brand_counts_as_a_name(db):
    """`ProductType.brand` estaba en el esquema desde el principio y no lo
    consultaba nadie. Es donde vive "Advil"."""
    ibuprofeno = _product(db, "Ibuprofeno 400mg tableta", category="MEDICINE", brand="Advil")

    assert [pt.id for pt in _shortlist(db, "advil 400", None)] == [ibuprofeno.id]


def test_an_alias_of_another_product_does_not_bring_this_one(db):
    """Un alias pertenece a su producto y no al catálogo entero."""
    _product(db, "Cobija de lana")
    botas = _product(db, "Botas de hule", category="RESCUE_GEAR")
    _alias(db, botas, "katiuskas")

    assert [pt.id for pt in _shortlist(db, "katiuskas", None)] == [botas.id]


def test_a_product_outside_the_visible_campaigns_stays_out(db):
    """El alias no puede ser una puerta trasera al scoping: un producto de otra
    campaña sigue invisible aunque su alias coincida."""
    ajeno = _product(db, "Cobija de lana")
    ajeno.campaign_id = uuid.uuid4()
    db.commit()
    _alias(db, ajeno, "frazada")

    assert _shortlist(db, "frazadas", None) == []


# ── El buscador que usan el panel y la aplicación ────────────────────────────


def test_the_search_box_finds_by_alias_too(db):
    """El punto de la fase. Si solo la IA mirara los alias, teclear "frazadas"
    encontraría el producto por un camino y no por el otro."""
    cobija = _product(db, "Cobija de lana")
    _alias(db, cobija, "frazada")

    encontrados = ProductTypeRepository(db).search("frazada")
    assert [pt.id for pt in encontrados] == [cobija.id]


def test_the_search_box_finds_by_alias_ignoring_accents(db):
    """La columna `normalized` existe justamente para esto: sin ella habría que
    normalizar en SQL con `unaccent`, que es una extensión de Postgres que
    SQLite no tiene, y la prueba dejaría de vigilar la consulta real."""
    paracetamol = _product(db, "Paracetamol 500mg tableta", category="MEDICINE")
    _alias(db, paracetamol, "acetaminofén")

    assert [pt.id for pt in ProductTypeRepository(db).search("ACETAMINOFEN")] == [
        paracetamol.id
    ]


def test_the_search_box_finds_by_brand(db):
    ibuprofeno = _product(db, "Ibuprofeno 400mg tableta", category="MEDICINE", brand="Advil")

    assert [pt.id for pt in ProductTypeRepository(db).search("advil")] == [ibuprofeno.id]


def test_the_search_box_still_finds_what_it_always_found(db):
    """Lo aditivo no puede quitar: el nombre sigue encontrando el producto."""
    cobija = _product(db, "Cobija de lana")

    assert [pt.id for pt in ProductTypeRepository(db).search("cobija")] == [cobija.id]


def test_an_alias_does_not_leak_a_product_from_another_campaign(db):
    """El mismo scoping que el shortlist, por el otro camino."""
    ajeno = _product(db, "Cobija de lana")
    ajeno.campaign_id = uuid.uuid4()
    db.commit()
    _alias(db, ajeno, "frazada")

    assert ProductTypeRepository(db).search("frazada") == []


# ── Los alias sembrados ──────────────────────────────────────────────────────


def test_every_seeded_alias_points_at_a_real_product():
    """Un alias huérfano es trabajo perdido y silencioso: la migración lo salta
    para no dejar un despliegue a medias, así que el ruido tiene que salir
    aquí, que es donde alguien lo puede arreglar."""
    from app.seeds._base import build_rows, seed_id
    from app.seeds.aliases import build_alias_rows
    from app.seeds.common_food import FOOD
    from app.seeds.iom_nonfood import NONFOOD
    from app.seeds.who_medicines import MEDICINES

    reales = {r["id"] for r in build_rows(FOOD) + build_rows(MEDICINES) + build_rows(NONFOOD)}
    huerfanos = [f["alias"] for f in build_alias_rows(seed_id) if f["product_type_id"] not in reales]

    assert huerfanos == [], f"apuntan a un producto que no existe: {huerfanos}"


def test_every_seeded_alias_earns_its_row():
    """Un alias que el emparejamiento normal ya encontraba no agrega nada y
    hace creer que la lista cubre más de lo que cubre. Si esta falla, la fila
    sobra: bórrala en vez de justificarla."""
    from app.seeds._base import build_rows, seed_id
    from app.seeds.aliases import build_alias_rows
    from app.seeds.common_food import FOOD
    from app.seeds.iom_nonfood import NONFOOD
    from app.seeds.who_medicines import MEDICINES

    por_id = {
        r["id"]: r for r in build_rows(FOOD) + build_rows(MEDICINES) + build_rows(NONFOOD)
    }

    redundantes = []
    for fila in build_alias_rows(seed_id):
        producto = por_id[fila["product_type_id"]]
        propias = set(
            words(" ".join(w for w in (producto["display_name"], producto["inn_name"]) if w))
        )
        if all(shares_stem(palabra, propias) for palabra in words(fila["alias"])):
            redundantes.append(f"{fila['alias']} → {producto['display_name']}")

    assert redundantes == [], f"ya se encontraban sin alias: {redundantes}"


def test_seeded_aliases_are_stored_normalized():
    """Lo que compara el buscador es `normalized`. Un alias guardado con acento
    ahí no lo encontraría nadie, y el fallo sería invisible."""
    from app.seeds._base import seed_id
    from app.seeds.aliases import build_alias_rows

    for fila in build_alias_rows(seed_id):
        assert fila["normalized"] == fila["normalized"].lower()
        assert "é" not in fila["normalized"] and "á" not in fila["normalized"]


def test_seeded_alias_ids_are_stable():
    """Re-sembrar no puede duplicar: los ids son uuid5 sobre producto + alias,
    igual que en el catálogo, y la migración inserta con ON CONFLICT DO NOTHING."""
    from app.seeds._base import seed_id
    from app.seeds.aliases import build_alias_rows

    primera = {f["id"] for f in build_alias_rows(seed_id)}
    segunda = {f["id"] for f in build_alias_rows(seed_id)}

    assert primera == segunda
    assert len(primera) == len(build_alias_rows(seed_id))
