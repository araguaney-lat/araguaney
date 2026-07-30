"""Peso de referencia por unidad, para los tipos de producto más comunes.

**Qué es y qué no es.** Es cuánto pesa *una* unidad del producto según su
`default_unit`: un kilo de arroz pesa 1 kg, una lata de atún pesa unos 140 g.
Sirve para una sola cosa — que al capturar una caja el sistema pueda decir
"solo el contenido pesaría ~X kg" y quien captura note un dedazo (2 kg donde la
referencia dice 20).

**No es el peso de la caja** y nunca llena ese campo. La caja se pesa en
báscula, y su peso incluye cartón, empaque, separadores y relleno.

Los valores son tamaños comerciales típicos en México, redondeados. No buscan
exactitud: un error del 20 % aquí no cambia nada, porque el número solo se usa
para comparar órdenes de magnitud. Un centro que quiera precisión edita el
producto en su catálogo y ese valor manda — la migración que siembra estos pesos
solo llena los que están vacíos.

Las llaves son `display_name` tal cual aparece en los módulos de seed. Un nombre
que no exista aquí simplemente se queda sin referencia, que es mejor que
inventarle un peso.
"""

# Alimentos. Los que se donan por kilo pesan un kilo por definición; el resto
# son presentaciones de anaquel.
FOOD_WEIGHTS: dict[str, float] = {
    "Arroz blanco": 1.0,
    "Arroz integral": 1.0,
    "Frijol negro": 1.0,
    "Frijol pinto": 1.0,
    "Frijol blanco": 1.0,
    "Lenteja": 1.0,
    "Garbanzo": 1.0,
    "Haba seca": 1.0,
    "Harina de maíz": 1.0,
    "Harina de trigo": 1.0,
    "Harina de arroz": 1.0,
    "Azúcar": 1.0,
    "Sal": 1.0,
    "Avena": 1.0,

    "Frijol en lata": 0.44,          # lata estándar de 440 g
    "Atún en lata": 0.14,
    "Sardina en lata": 0.42,
    "Leche evaporada": 0.36,
    "Puré de tomate": 0.21,
    "Maíz en lata": 0.4,
    "Chícharo en lata": 0.4,
    "Durazno en lata": 0.8,
    "Fórmula infantil": 0.9,

    "Aceite vegetal": 0.92,          # botella de 1 L, densidad ~0.92
    "Salsa de tomate": 0.37,
    "Miel": 0.5,
    "Mantequilla de maní": 0.5,
    "Mermelada": 0.5,

    "Leche en polvo": 0.4,
    "Café": 0.5,
    "Café soluble": 0.2,
    "Chocolate en polvo": 0.4,
    "Nuez / fruto seco": 0.25,

    "Pasta": 0.2,
    "Fideos": 0.2,
    "Sopa instantánea": 0.07,        # sobre individual
    "Galletas": 0.15,
    "Galletas saladas": 0.15,
    "Cereal": 0.5,
    "Barra de granola": 0.03,
}

# Higiene y agua: los dos rubros que más volumen mueven después de alimentos.
NONFOOD_WEIGHTS: dict[str, float] = {
    # Higiene
    "Jabón de tocador en barra 100 g": 0.1,
    "Kit de higiene familiar": 3.5,
    "Kit de higiene menstrual": 0.6,
    "Toallas sanitarias (paquete)": 0.2,
    "Pasta dental 100 ml": 0.13,
    "Cepillo dental adulto": 0.02,
    "Shampoo 400 ml": 0.43,
    "Papel higiénico (rollo)": 0.13,
    "Pañal desechable talla M (paquete)": 1.2,
    "Pañal para adulto (paquete)": 1.6,
    "Cubeta con tapa 14 L": 0.7,     # vacía: se dona el recipiente
    "Detergente en polvo 1 kg": 1.0,
    "Gel antibacterial 250 ml": 0.27,
    "Toalla de baño": 0.4,

    # Agua. Los recipientes se donan vacíos — pesa el envase, no su capacidad,
    # que es el error más fácil de cometer al capturar.
    "Bidón plegable 10 L": 0.3,
    "Bidón plegable 20 L": 0.5,
    "Balde con grifo 20 L": 1.2,
    "Contenedor rígido de agua 10 L": 0.8,
    "Tabletas potabilizadoras de agua": 0.25,
    "Filtro de agua cerámico doméstico": 2.5,
    "Kit de tratamiento de agua para el hogar": 3.0,
    "Hipoclorito de calcio (HTH) 1 kg": 1.0,
}

# Vista única para migraciones y tests.
ALL_WEIGHTS: dict[str, float] = {**FOOD_WEIGHTS, **NONFOOD_WEIGHTS}
