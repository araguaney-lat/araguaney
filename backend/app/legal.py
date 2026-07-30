"""Current version of the legal documents users must accept.

Bump this string whenever the Privacy Notice or Terms materially change
(frontend/src/content/legal/{privacy,terms}.{es,en}.ts each carry a matching
`version` field, and frontend/src/lib/legal.ts mirrors this constant — all
three must be bumped together). Existing users whose `accepted_terms_version`
no longer matches this value are re-gated to /accept-terms on next login.
"""

CURRENT_TERMS_VERSION = "1.0"

# Términos de Donación en Especie (Fase 20). Versión independiente de la de
# usuarios: quien dona no tiene cuenta, acepta otro documento y en otro momento.
# Al subirla, las aceptaciones anteriores no se invalidan — quedan registradas
# contra la versión que la persona efectivamente leyó.
CURRENT_DONATION_TERMS_VERSION = "1.0"

# Leyenda de aduana (Fase 20, task 4). Es donde el control rector se vuelve
# oponible frente a terceros: quien recibe lee que los bienes se transfirieron
# de forma irrevocable, sin valor comercial y sin consignatario designado por
# quien donó. Vive aquí, y no en cada plantilla, porque un texto repetido en
# cuatro documentos se desfasa en cuanto alguien edite uno solo.
CUSTOMS_LEGEND_ES = (
    "Donación humanitaria sin valor comercial. Bienes transferidos de forma "
    "irrevocable al consignatario humanitario."
)
CUSTOMS_LEGEND_EN = (
    "Humanitarian donation, no commercial value. Goods irrevocably transferred "
    "to the humanitarian consignee."
)
