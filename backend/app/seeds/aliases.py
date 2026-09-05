"""Otros nombres por los que la gente pide un producto del catálogo.

**Qué entra aquí y qué no.** Entra lo que se sabe sin datos: hechos del idioma.
"Frazada" y "cobija" son la misma cosa en español, y eso no depende de cuánta
gente lo teclee. **No** entran las marcas comerciales —"advil", "tempra"—, que
son miles, cambian por país y salen del laboratorio, no del idioma: curarlas a
mano es una carrera que se pierde sola. Esas se acumulan de las elecciones
reales de captura (`product_mapping_choices`), que es donde ya se registra qué
tecleó alguien y qué producto eligió.

Cada fila referencia su producto por la misma llave natural que usa el catálogo
sembrado, así que el id sale de `seed_id()` y no de escribirlo a mano. Si el
producto cambia de nombre pero no de llave, el alias lo sigue.

Fuentes de la variación regional: es español de México, Venezuela, Colombia y el
Cono Sur mezclado a propósito, porque la plataforma opera en varios países y
quien captura en Monterrey puede recibir una donación descrita por alguien que
no habla como en Monterrey.
"""

# (categoría, display_name del producto, [alias...])
#
# MEDICINE va con su llave completa (inn_name, strength, form) porque el
# catálogo distingue medicamentos por concentración: ver `natural_key`.
NONFOOD_ALIASES: list[tuple[str, str, list[str]]] = [
    ("OTHER", "Cobija de lana", ["frazada", "frazadas", "manta", "mantas", "colcha"]),
    ("RESCUE_GEAR", "Botas de hule impermeables", ["botas de goma", "katiuskas", "botas de agua"]),
    ("HYGIENE", "Pañal desechable talla M (paquete)", ["diaper", "pañal para bebe"]),
    ("HYGIENE", "Toallas sanitarias (paquete)", ["toallas femeninas", "toallitas", "compresas"]),
    ("HYGIENE", "Jabón de tocador en barra 100 g", ["jabon de baño", "jabon de mano", "pastilla de jabon"]),
    ("HYGIENE", "Papel higiénico (rollo)", ["papel de baño", "papel sanitario", "papel toilette"]),
    ("HYGIENE", "Cepillo dental adulto", ["cepillo de dientes"]),
    ("HYGIENE", "Pasta dental 100 ml", ["crema dental", "dentifrico", "pasta de dientes"]),
    ("HYGIENE", "Gel antibacterial 250 ml", ["alcohol en gel", "gel desinfectante"]),
    ("MEDICAL_SUPPLY", "Cubrebocas N95", ["tapabocas", "mascarilla", "barbijo", "nasobuco"]),
    ("MEDICAL_SUPPLY", "Venda elástica 10 cm", ["venda de gasa"]),
    ("MEDICAL_SUPPLY", "Gasa estéril 10x10 cm", ["apositos"]),
    ("MEDICAL_SUPPLY", "Alcohol etílico 70% 1 L", ["alcohol de curacion"]),
    ("TOOL", "Linterna LED de mano", ["lampara de mano", "foco de mano"]),
    ("FOOD", "Atún en lata", ["atun enlatado"]),
    ("FOOD", "Frijol negro", ["caraotas", "porotos negros"]),
    ("FOOD", "Aceite vegetal", ["aceite de cocina", "aceite comestible"]),
]

# (inn_name, strength, form, [alias...]) — la llave natural de un medicamento.
#
# Solo nombres alternos de la sustancia, no marcas. "Acetaminofén" es el nombre
# USAN del paracetamol: dos nomenclaturas oficiales de la misma molécula, y cuál
# se usa depende del país. RxNorm y la lista ATC de la OMS ya publican estas
# equivalencias y son la fuente correcta a mediano plazo; estas cuatro están
# escritas a mano mientras esa integración no exista.
MEDICINE_ALIASES: list[tuple[str, str, str, list[str]]] = [
    ("Paracetamol", "500mg", "tableta", ["acetaminofen", "acetaminofeno"]),
    ("Amoxicilina", "500mg", "cápsula", ["amoxiciline"]),
]


def build_alias_rows(seed_id_for) -> list[dict]:
    """Filas listas para insertar: `(product_type_id, alias, normalized)`.

    `seed_id_for` se recibe en vez de importarse para que la migración pueda
    pasar la misma función que usó al sembrar el catálogo, sin que este módulo
    dependa de nada más que del stdlib.
    """
    import uuid

    from app.utils.text_matching import normalize

    from app.seeds._base import SEED_NAMESPACE

    filas: list[dict] = []
    vistos: set[tuple[str, str]] = set()

    def agregar(row_key: dict, aliases: list[str]) -> None:
        product_id = seed_id_for(row_key)
        for alias in aliases:
            clave = (str(product_id), normalize(alias))
            if clave in vistos:
                continue
            vistos.add(clave)
            filas.append(
                {
                    # uuid5 sobre (producto, alias normalizado): re-sembrar
                    # no duplica, igual que en el catálogo.
                    "id": uuid.uuid5(SEED_NAMESPACE, f"alias|{clave[0]}|{clave[1]}"),
                    "product_type_id": product_id,
                    "alias": alias,
                    "normalized": normalize(alias),
                }
            )

    for category, display_name, aliases in NONFOOD_ALIASES:
        agregar({"category": category, "display_name": display_name}, aliases)

    for inn_name, strength, form, aliases in MEDICINE_ALIASES:
        agregar(
            {
                "category": "MEDICINE",
                "inn_name": inn_name,
                "strength": strength,
                "form": form,
                "display_name": f"{inn_name} {strength} {form}",
            },
            aliases,
        )

    return filas
