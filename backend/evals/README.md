# Conjunto de referencia de IA (Fase 23, task 8)

Sin medición no hay fase: una sugerencia mala que nadie mide degrada el catálogo
en silencio.

## Qué hay aquí

| Archivo | Capacidad | Casos |
|---|---|---|
| `mapping_cases.json` | Mapeo de texto libre → catálogo | Renglones como los escribe quien dona, con el producto que les corresponde |
| `ocr_cases.json` | OCR de etiqueta de medicamento | Referencia de la imagen y los campos que deberían leerse |

## Los umbrales están fijados de antemano

Viven en `app/services/ai/evaluation.py`, y se fijaron **al construir el
conjunto, antes de medir nada**. Un umbral elegido después de ver los resultados
no es un umbral, es una justificación.

Si una capacidad no los supera, no se enciende: se cambia de modelo, se mejora el
prompt, o se queda apagada.

## Cómo se corre

```bash
# Contra el proveedor configurado, llamando al pipeline real
# (text_mapping.suggest() sobre un catálogo sembrado con los datos reales de
# producción — app/seeds/common_food.py, who_medicines.py, iom_nonfood.py).
AI_API_KEY=sk-... python -m evals.run --capability mapping
AI_API_KEY=sk-... AI_MODEL=deepseek-chat python -m evals.run --capability mapping

# OCR no corre todavía — ver "Estado del conjunto" abajo.
python -m evals.run --capability ocr

# En CI corre contra un proveedor simulado: la suite no debe depender de que un
# tercero tenga un buen día. Estos prueban el instrumento (evaluation.py), no
# el pipeline real — eso solo lo hace el comando de arriba, que gasta dinero.
pytest tests/test_ai_evaluation.py tests/test_ai_eval_runner.py
```

Hasta el 2026-09-03 `evals/run.py` le hablaba al proveedor con un prompt propio,
sin catálogo, sin pasar por `text_mapping.suggest()` ni `label_ocr.extract()` —
medía un modelo distinto al que en verdad estaba (y sigue estando) encendido en
producción. Ahora llama exactamente a esas funciones.

## Estado del conjunto

La spec pide ~100 casos por capacidad **con datos reales del escenario
sembrado**. Hoy hay una primera tanda escrita a partir del dominio (los productos
del catálogo semilla y las formas en que la gente nombra lo que dona) — no son
capturas reales de un donante o un centro, y de los 36 casos de mapeo, 30 tienen
un producto real detrás en el catálogo de hoy (`_SLUG_TO_REAL_PRODUCT` en
`evals/run.py`); los otros 6 (agua embotellada/garrafón, jabón de lavandería,
pilas AA, guante de látex) son huecos reales del catálogo semilla, no fallas del
modelo, y se reportan aparte en cada corrida.

El de OCR tiene 3 casos declarados y **cero fotos**: `image_ref` apunta a un
almacenamiento de evaluación que nadie llenó todavía (a propósito — una foto de
etiqueta puede llevar datos personales incidentales). No hay manera de correrlo
hoy sin que alguien suba fotos reales primero.

Completarlo de verdad exige capturas reales: renglones que hayan escrito
donantes de verdad y fotos de cajas que hayan pasado por un centro. **Ninguna
capacidad se enciende en producción hasta que su conjunto llegue a ese
tamaño con datos reales**, porque un conjunto pequeño o sintético mide poco y
da confianza de más — ver la nota de la Fase 26 sobre el enganche que empieza a
capturar esas confirmaciones (`ProductMappingChoice` en
`app/models/product_mapping_choice.py`), pendiente de acumular volumen.
