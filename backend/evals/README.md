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

# OCR: lee las fotos de `evals/labels/` (o de donde diga --labels-dir) y las
# manda incrustadas, por la misma vía que el formulario de captura. Si falta
# una foto o alguna pesa de más, no se corre nada y se listan todas: descubrir
# en el caso 60 que el 61 tiene el nombre mal escrito es pagar 60 llamadas
# para enterarse.
AI_API_KEY=sk-... python -m evals.run --capability ocr
AI_API_KEY=sk-... python -m evals.run --capability ocr --labels-dir ~/etiquetas

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

El de OCR tiene 3 casos declarados y **cero fotos**: falta tomarlas. El runner
ya las lee de `evals/labels/`, así que basta con dejarlas ahí con el nombre que
declara cada caso.

**Las fotos no se versionan.** La carpeta está en `.gitignore` porque el
repositorio es público y un push no se deshace (REGLA #2): una caja de
medicamento puede traer de refilón la etiqueta de la farmacia con el nombre de
quien lo recibió, y revisar cien fotos con ojos adversarios es mucho más difícil
que revisar cien líneas de texto. Respáldalas donde quieras, fuera del código.
Al repositorio sube solo `ocr_cases.json`, que es donde está el trabajo de
verdad: la respuesta correcta de cada foto, escrita a mano antes de medir.

Esas fotos se toman a propósito, no se cosechan del sistema. **Con la cámara
normal del teléfono**, no desde la aplicación: para armar la regla solo hacen
falta archivos de imagen, así que no hay nada que instalar ni ninguna versión
que publicar. Para el mapeo de
texto lo real es irremplazable —nadie inventa fielmente que alguien escriba
"advil 400"— pero el insumo del OCR es la fotografía de una caja impresa: una
foto de un medicamento real **es** un caso real venga de donde venga, y lo que
la hace representativa son las condiciones de la toma. Al armar el conjunto,
que se parezcan a lo que pasa en un centro:

- Cajas de medicamento reales, no maquetas ni fotos de catálogo.
- Luz de bodega, no de estudio. Sombras, reflejo del plástico, foto de noche.
- Ángulos torcidos, cajas abolladas, etiquetas despegadas o con precio encima.
- Algunas donde falte un campo: sin lote visible, o con caducidad solo mes/año.
- Teléfonos distintos, que es lo que va a haber.

Guarda cada foto **al tamaño que manda la aplicación**: lado largo 1600 px. El
formulario de captura reduce antes de subir, así que medir sobre la original de
12 MB mide una imagen que en producción nunca se envía — y de paso el runner la
rechaza, porque el backend corta en 5 MB. De eso se encarga un comando:

```bash
# Lee de la carpeta de origen y escribe en evals/labels/. Las originales
# quedan intactas, y una foto que ya esté en el destino no se pisa sin --force.
python -m evals.resize_labels ~/Downloads/fotos-etiquetas
```

Aplica la rotación que el teléfono anota en EXIF —el navegador la respeta y una
reducción ingenua no, así que sin esto el conjunto quedaría con etiquetas
acostadas— y no arrastra los metadatos, incluida la ubicación donde se tomó
cada foto.

Por cada foto se escriben a mano los campos correctos —los que una persona lee
de la caja— y se agrega el caso a `ocr_cases.json`. La respuesta esperada se
escribe **antes** de correr el OCR: escribirla después de ver lo que el modelo
contestó deja de ser una medición.

Completarlo de verdad exige capturas reales: renglones que hayan escrito
donantes de verdad y fotos de cajas que hayan pasado por un centro. Un conjunto
pequeño o sintético mide poco y da confianza de más. El enganche que empieza a
capturar esas confirmaciones ya existe (`ProductMappingChoice` en
`app/models/product_mapping_choice.py`, `POST /v1/catalog/mapping-choices`) y
espera dos cosas: que el panel lo llame cuando alguien resuelve una sugerencia,
y luego volumen.

La regla de la fase es que ninguna capacidad se encienda sin superar el umbral
de su conjunto. Conviene decir en voz alta que las cuatro banderas se
encendieron en producción antes de que ese conjunto existiera con datos reales,
así que hoy la regla describe el orden deseado y no lo que pasó.

## Última medición

| Fecha | Capacidad | Modelo | Casos | top-1 | top-3 | Costo |
|---|---|---|---|---:|---:|---:|
| 2026-09-04 | mapeo de texto | `gpt-4o-mini` | 30 | 87% | 87% | $0.0018 |

Supera ambos umbrales (60% / 85%). La corrida anterior del mismo día, antes de
corregir la recuperación de candidatos, daba 57% / 57%: el modelo acertaba
siempre que veía el producto correcto, y casi todos los fallos eran listas
cortas vacías. El detalle de qué se corrigió y qué sigue fallando —sinónimos
regionales y marcas comerciales, que ninguna búsqueda alcanza— está en la nota
del 2026-09-04 de [`docs/roadmap/phase-23-ai-assisted-capture.md`](../../docs/roadmap/phase-23-ai-assisted-capture.md).

Vale para lo que es: mide el pipeline real contra casos escritos a mano, no
contra capturas reales.
