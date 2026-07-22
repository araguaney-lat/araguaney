"""Non-food relief items seed data.

IFRC/ICRC Emergency Items Catalogue + IOM relief standards — curated subset.
Pure data module: `NONFOOD` is a list of dicts with exactly the keys
`category`, `display_name`, `default_unit`, `unspsc_code`. UNSPSC codes are
provided only where a plausible standard code is known; otherwise `None`.
"""

NONFOOD: list[dict] = [
    # --- MEDICAL_SUPPLY ---
    {"category": "MEDICAL_SUPPLY", "display_name": "Guantes de examen de nitrilo (caja 100)", "default_unit": "cajas", "unspsc_code": "42132203"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Guantes quirúrgicos estériles", "default_unit": "pares", "unspsc_code": "42132205"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Jeringa desechable 5 ml", "default_unit": "piezas", "unspsc_code": "42142523"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Aguja hipodérmica 21G", "default_unit": "piezas", "unspsc_code": "42142530"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Gasa estéril 10x10 cm", "default_unit": "piezas", "unspsc_code": "42311505"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Venda elástica 10 cm", "default_unit": "rollos", "unspsc_code": "42311511"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Suero fisiológico 0.9% 500 ml", "default_unit": "unidades", "unspsc_code": "42142606"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Catéter intravenoso 18G", "default_unit": "piezas", "unspsc_code": "42142404"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Equipo de venoclisis (macrogotero)", "default_unit": "piezas", "unspsc_code": "42221503"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Mascarilla quirúrgica de 3 capas", "default_unit": "cajas", "unspsc_code": "42131713"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Cubrebocas N95", "default_unit": "piezas", "unspsc_code": "46182003"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Torniquete de emergencia (CAT)", "default_unit": "piezas", "unspsc_code": "42311707"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Apósito adhesivo estéril", "default_unit": "piezas", "unspsc_code": "42311504"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Alcohol etílico 70% 1 L", "default_unit": "litros", "unspsc_code": "51471901"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Algodón absorbente 500 g", "default_unit": "bolsas", "unspsc_code": "42311502"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Termómetro digital", "default_unit": "piezas", "unspsc_code": "41112202"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Tensiómetro aneroide con estetoscopio", "default_unit": "sets", "unspsc_code": "42181602"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Camilla plegable de lona", "default_unit": "piezas", "unspsc_code": "42192210"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Sutura de nylon 3-0", "default_unit": "piezas", "unspsc_code": "42312006"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Esparadrapo de tela 2.5 cm", "default_unit": "rollos", "unspsc_code": "42311708"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Antiséptico yodopovidona 500 ml", "default_unit": "unidades", "unspsc_code": "51102710"},
    {"category": "MEDICAL_SUPPLY", "display_name": "Contenedor de punzocortantes 2 L", "default_unit": "piezas", "unspsc_code": "42172001"},

    # --- HYGIENE ---
    {"category": "HYGIENE", "display_name": "Jabón de tocador en barra 100 g", "default_unit": "piezas", "unspsc_code": "53131608"},
    {"category": "HYGIENE", "display_name": "Kit de higiene familiar", "default_unit": "kits", "unspsc_code": "53131601"},
    {"category": "HYGIENE", "display_name": "Kit de higiene menstrual", "default_unit": "kits", "unspsc_code": "53131629"},
    {"category": "HYGIENE", "display_name": "Toallas sanitarias (paquete)", "default_unit": "bolsas", "unspsc_code": "53131641"},
    {"category": "HYGIENE", "display_name": "Pasta dental 100 ml", "default_unit": "piezas", "unspsc_code": "53131510"},
    {"category": "HYGIENE", "display_name": "Cepillo dental adulto", "default_unit": "piezas", "unspsc_code": "53131502"},
    {"category": "HYGIENE", "display_name": "Shampoo 400 ml", "default_unit": "piezas", "unspsc_code": "53131628"},
    {"category": "HYGIENE", "display_name": "Papel higiénico (rollo)", "default_unit": "rollos", "unspsc_code": "14111704"},
    {"category": "HYGIENE", "display_name": "Pañal desechable talla M (paquete)", "default_unit": "bolsas", "unspsc_code": "53102306"},
    {"category": "HYGIENE", "display_name": "Pañal para adulto (paquete)", "default_unit": "bolsas", "unspsc_code": "53131623"},
    {"category": "HYGIENE", "display_name": "Cubeta con tapa 14 L", "default_unit": "piezas", "unspsc_code": "24111503"},
    {"category": "HYGIENE", "display_name": "Detergente en polvo 1 kg", "default_unit": "bolsas", "unspsc_code": "47131810"},
    {"category": "HYGIENE", "display_name": "Gel antibacterial 250 ml", "default_unit": "piezas", "unspsc_code": "53131626"},
    {"category": "HYGIENE", "display_name": "Toalla de baño", "default_unit": "piezas", "unspsc_code": "52121701"},

    # --- WATER ---
    {"category": "WATER", "display_name": "Bidón plegable 10 L", "default_unit": "piezas", "unspsc_code": "24111808"},
    {"category": "WATER", "display_name": "Bidón plegable 20 L", "default_unit": "piezas", "unspsc_code": "24111808"},
    {"category": "WATER", "display_name": "Balde con grifo 20 L", "default_unit": "piezas", "unspsc_code": "24111503"},
    {"category": "WATER", "display_name": "Tabletas potabilizadoras de agua", "default_unit": "cajas", "unspsc_code": "51102708"},
    {"category": "WATER", "display_name": "Filtro de agua cerámico doméstico", "default_unit": "piezas", "unspsc_code": "40161505"},
    {"category": "WATER", "display_name": "Contenedor rígido de agua 10 L", "default_unit": "piezas", "unspsc_code": "24111808"},
    {"category": "WATER", "display_name": "Kit de tratamiento de agua para el hogar", "default_unit": "kits", "unspsc_code": "40161500"},
    {"category": "WATER", "display_name": "Hipoclorito de calcio (HTH) 1 kg", "default_unit": "bolsas", "unspsc_code": "12352102"},

    # --- TOOL ---
    {"category": "TOOL", "display_name": "Pala recta con mango", "default_unit": "piezas", "unspsc_code": "27112004"},
    {"category": "TOOL", "display_name": "Pico de acero con mango", "default_unit": "piezas", "unspsc_code": "27112013"},
    {"category": "TOOL", "display_name": "Machete 18 pulgadas", "default_unit": "piezas", "unspsc_code": "27111601"},
    {"category": "TOOL", "display_name": "Martillo de uña 16 oz", "default_unit": "piezas", "unspsc_code": "27111701"},
    {"category": "TOOL", "display_name": "Carretilla metálica", "default_unit": "piezas", "unspsc_code": "24101504"},
    {"category": "TOOL", "display_name": "Cuerda de nylon 12 mm", "default_unit": "metros", "unspsc_code": "31151905"},
    {"category": "TOOL", "display_name": "Lona reforzada 4x6 m", "default_unit": "piezas", "unspsc_code": "24141506"},
    {"category": "TOOL", "display_name": "Kit de utensilios de cocina familiar", "default_unit": "kits", "unspsc_code": "52151504"},
    {"category": "TOOL", "display_name": "Estufa de queroseno portátil", "default_unit": "piezas", "unspsc_code": "52141505"},
    {"category": "TOOL", "display_name": "Lámpara solar recargable", "default_unit": "piezas", "unspsc_code": "39111610"},
    {"category": "TOOL", "display_name": "Linterna LED de mano", "default_unit": "piezas", "unspsc_code": "39111610"},
    {"category": "TOOL", "display_name": "Bidón de combustible 20 L", "default_unit": "piezas", "unspsc_code": "24111801"},
    {"category": "TOOL", "display_name": "Kit de herramientas básicas", "default_unit": "kits", "unspsc_code": "27111500"},
    {"category": "TOOL", "display_name": "Generador eléctrico portátil", "default_unit": "piezas", "unspsc_code": "26111602"},
    {"category": "TOOL", "display_name": "Serrucho de mano", "default_unit": "piezas", "unspsc_code": "27112101"},
    {"category": "TOOL", "display_name": "Clavos de acero 3 pulgadas (kg)", "default_unit": "bolsas", "unspsc_code": "31161502"},

    # --- RESCUE_GEAR ---
    {"category": "RESCUE_GEAR", "display_name": "Casco de seguridad", "default_unit": "piezas", "unspsc_code": "46181701"},
    {"category": "RESCUE_GEAR", "display_name": "Chaleco reflectante de alta visibilidad", "default_unit": "piezas", "unspsc_code": "46181503"},
    {"category": "RESCUE_GEAR", "display_name": "Botas de hule impermeables", "default_unit": "pares", "unspsc_code": "46181604"},
    {"category": "RESCUE_GEAR", "display_name": "Guantes de trabajo de carnaza", "default_unit": "pares", "unspsc_code": "46181504"},
    {"category": "RESCUE_GEAR", "display_name": "Cuerda de rescate estática 11 mm", "default_unit": "metros", "unspsc_code": "46171610"},
    {"category": "RESCUE_GEAR", "display_name": "Camilla rígida de rescate", "default_unit": "piezas", "unspsc_code": "42192210"},
    {"category": "RESCUE_GEAR", "display_name": "Silbato de emergencia", "default_unit": "piezas", "unspsc_code": "46171501"},
    {"category": "RESCUE_GEAR", "display_name": "Kit de primeros auxilios", "default_unit": "kits", "unspsc_code": "42172001"},
    {"category": "RESCUE_GEAR", "display_name": "Extintor de polvo químico ABC 4.5 kg", "default_unit": "piezas", "unspsc_code": "46191601"},
    {"category": "RESCUE_GEAR", "display_name": "Arnés de seguridad de cuerpo completo", "default_unit": "piezas", "unspsc_code": "46181529"},
    {"category": "RESCUE_GEAR", "display_name": "Gafas de protección", "default_unit": "piezas", "unspsc_code": "46181902"},
    {"category": "RESCUE_GEAR", "display_name": "Mascarilla respiratoria con filtro", "default_unit": "piezas", "unspsc_code": "46182004"},
    {"category": "RESCUE_GEAR", "display_name": "Radio de comunicación portátil", "default_unit": "piezas", "unspsc_code": "43191501"},
    {"category": "RESCUE_GEAR", "display_name": "Impermeable de campo", "default_unit": "piezas", "unspsc_code": "46181543"},

    # --- OTHER (shelter / bedding) ---
    {"category": "OTHER", "display_name": "Cobija térmica de emergencia", "default_unit": "piezas", "unspsc_code": "24111811"},
    {"category": "OTHER", "display_name": "Cobija de lana", "default_unit": "piezas", "unspsc_code": "52121510"},
    {"category": "OTHER", "display_name": "Colchoneta de dormir", "default_unit": "piezas", "unspsc_code": "52121612"},
    {"category": "OTHER", "display_name": "Mosquitero tratado con insecticida", "default_unit": "piezas", "unspsc_code": "52131612"},
    {"category": "OTHER", "display_name": "Carpa familiar para 5 personas", "default_unit": "piezas", "unspsc_code": "56101702"},
    {"category": "OTHER", "display_name": "Plástico para techo (tarpaulin) 4x5 m", "default_unit": "piezas", "unspsc_code": "24141506"},
    {"category": "OTHER", "display_name": "Sábana de algodón", "default_unit": "piezas", "unspsc_code": "52121502"},
    {"category": "OTHER", "display_name": "Kit de dormir individual", "default_unit": "kits", "unspsc_code": "52121500"},
    {"category": "OTHER", "display_name": "Costal de rafia 50 kg", "default_unit": "piezas", "unspsc_code": "24121806"},
    {"category": "OTHER", "display_name": "Set de ropa de abrigo", "default_unit": "sets", "unspsc_code": None},
]
