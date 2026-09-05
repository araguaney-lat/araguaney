"""Cómo se compara lo que alguien escribe contra el nombre de un producto.

Vive en `utils/` y no dentro de `services/ai/` porque tiene **dos**
consumidores: el shortlist que arma los candidatos para la IA
(`services/ai/text_mapping.py`) y el buscador de catálogo
(`repositories/product_type_repository.py`), que es el que usan el formulario
del panel y la aplicación móvil.

Que sean la misma regla no es prolijidad. Si el buscador y la IA normalizaran
distinto, teclear "frazadas" encontraría el producto por un camino y no por el
otro, y quien captura sufriría una incoherencia que no puede explicarse. Un
repositorio tampoco puede importar de un servicio sin invertir las capas, así
que la regla baja a donde los dos alcanzan.
"""

from __future__ import annotations

import re
import unicodedata

# Palabras funcionales del español: pasan el filtro de largo mínimo pero no
# dicen nada del producto, y al compararse por substring encuentran cualquier
# nombre que las contenga por casualidad ortográfica ("para" dentro de
# "comparativa"). Van sin acento porque se comparan ya normalizadas.
STOPWORDS = {
    "que", "para", "por", "con", "sin", "los", "las", "del", "una", "unos",
    "unas", "esa", "ese", "esta", "este", "sus", "mas", "pero", "como",
}

# Un plural en español agrega "s" o "es", así que dos formas de la misma
# palabra se llevan a lo más dos letras. Más allá de eso, que una esté dentro
# de la otra ya no dice que sean la misma palabra sino que coinciden por
# casualidad: "gel" dentro de "gelatina", "sal" dentro de "salchichas".
MAX_STEM_DELTA = 2

# Sobre texto ya normalizado no quedan acentos ni mayúsculas, así que separar
# corridas alfanuméricas basta — y de paso descarta la puntuación que traen
# varios nombres del catálogo: "(paquete)", "Gasa estéril 10x10 cm".
_WORD = re.compile(r"[a-z0-9]+")


def normalize(text: str) -> str:
    """Minúsculas y sin acentos, para que 'ATÚN' y 'atun' comparen igual.

    Quien captura con prisa no siempre teclea el acento, y el español lo usa
    donde no cambia a qué producto se refiere.
    """
    sin_acentos = "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )
    return sin_acentos.lower()


def words(text: str) -> list[str]:
    """Palabras que vale la pena comparar: normalizadas, sin puntuación, sin
    palabras funcionales, sin números sueltos y de al menos tres letras.

    La misma regla corre sobre el texto del donante y sobre el nombre del
    producto a propósito: dos lados que se comparan tienen que haber pasado
    por la misma normalización, o la comparación termina midiendo la
    diferencia entre las reglas y no entre las palabras.
    """
    return [
        palabra
        for palabra in _WORD.findall(normalize(text))
        if len(palabra) >= 3 and not palabra.isdigit() and palabra not in STOPWORDS
    ]


def shares_stem(word: str, catalog_words: set[str]) -> bool:
    """Si `word` es una variante de alguna palabra del producto.

    El español pluraliza agregando terminación ("cobija" -> "cobijas",
    "pañal" -> "pañales"), así que el singular queda dentro del plural. Se
    compara en los dos sentidos —por si el catálogo guarda el plural— y con
    un límite de longitud: sin él, toda palabra corta dentro de una larga
    contaría como variante.
    """
    for candidata in catalog_words:
        corta, larga = sorted((word, candidata), key=len)
        if len(larga) - len(corta) <= MAX_STEM_DELTA and corta in larga:
            return True
    return False
