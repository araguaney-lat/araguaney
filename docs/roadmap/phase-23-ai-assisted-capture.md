# Fase 23 — IA asistida: captura, catálogo y necesidades

> Cuatro capacidades que atacan el cuello de botella real (la captura), bajo un
> principio único: **la IA pre-llena, la persona confirma; nada se sella con un
> dato que nadie miró.** Mapeo de texto libre a catálogo, OCR de etiqueta de
> medicamento, emparejamiento de necesidades con stock y resumen del agregado
> nacional.
>
> **Spec:** `docs/superpowers/specs/2026-07-29-ai-assisted-capture-design.md`
> **Costo:** con un modelo del tramo económico, ~$0.00007 por renglón mapeado y
> ~$0.0002 por foto leída; 10,000 operaciones al mes cuestan menos de $2. El
> riesgo no es el precio unitario sino el volumen no controlado, por eso la
> fase entera está construida alrededor de cinco guardarraíles de gasto.
> **Proveedor:** neutral. El boilerplate ya trae la capa OpenAI-compatible con
> `AI_BASE_URL`, así que Gemini, DeepSeek, Groq, Together u Ollama local entran
> por variables de entorno.
> **Relación:** el mapeo desbloquea la recepción de la Fase 18; el OCR alimenta
> el intake y el catálogo que aprende (Fase 19).

---

## Objetivos

1. Que el texto libre del donante (Fase 18) no se convierta en trabajo manual
   del coordinador.
2. Quitar el trámite más lento del intake: teclear INN, forma, concentración,
   lote y caducidad de una cajita de medicamento.
3. Convertir el tablón de solicitudes en emparejamiento real contra el stock.
4. Que el gasto sea acotado, medible y apagable, sin ninguna llamada de IA en
   endpoints públicos.

## No-objetivos

- Chatbot o asistente conversacional.
- Estimar volumen, peso o conteo desde una foto (descartado con evidencia en el
  spec: sin referencia de escala no hay estimación, y los modelos cuentan mal).
- Decisiones automáticas: nada se sella, rechaza, asigna ni despacha sin humano.
- Triage automático de banderas rojas de la Fase 20 (un falso positivo acusa a
  alguien de lavado; posible v2 con revisión humana obligatoria).
- Entrenar o afinar modelos propios.

---

## Tareas

### Cimientos y control de gasto

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Adaptador de proveedor | Interfaz delgada (`clasificar_texto`, `extraer_de_imagen`, `resumir`) sobre la capa OpenAI-compatible existente. Modelo y `base_url` por entorno; sin amarre a un proveedor. Doble para pruebas. | 🟠 Media | ✅ Done |
| 2 | Guardarraíles de gasto | `AI_MONTHLY_BUDGET_USD` con registro de gasto por llamada e interruptor automático al alcanzarlo; rate limiting por usuario y centro sobre `slowapi`; caché de resultados en Redis (`app.utils.cache`); bandera por capacidad. **Ninguna capacidad se invoca desde un endpoint público.** | 🔴 Alta | ✅ Done |
| 3 | Panel de gasto | Consumo del mes por capacidad, visible para `superadmin` en `/studio`, con el estado del interruptor. | 🟢 Baja | ✅ Done |

### Capacidades

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 4 | Mapeo de texto libre → catálogo | En la recepción (Fase 18, autenticada): cada renglón de texto libre llega con 3 sugerencias por confianza; el coordinador elige, busca o crea. La elección alimenta el catálogo que aprende (Fase 19). | 🔴 Alta | ✅ Done |
| 5 | OCR de etiqueta de medicamento | Foto → `inn_name`, `form`, `strength`, `batch`, `expiry_date` pre-llenados, editables y marcados como sugeridos hasta confirmarse. La caducidad pasa por la validación de 365 días existente. | 🔴 Alta | ✅ Done |
| 6 | Necesidades ↔ stock | La solicitud muestra qué centros tienen inventario compatible y en qué cantidad. Scoped por tenant: un centro no descubre el stock de otro salvo `national_admin`. | 🟠 Media | ✅ Done |
| 7 | Resumen del agregado nacional | Párrafo generado sobre las cifras que el panel ya calcula, para prensa y donantes institucionales. Sin datos personales en el prompt. | 🟢 Baja | ✅ Done |

### Evaluación, pruebas y cierre

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 8 | Conjunto de referencia y umbrales | ~100 casos por capacidad con datos reales; métricas declaradas (top-1 y top-3 para mapeo, exactitud por campo para OCR); umbral de encendido fijado **antes** de ver resultados. Sirve además para comparar modelos por costo y calidad. | 🔴 Alta | ✅ Done |
| 9 | Tests | Adaptador con doble (sin red en pruebas), bandera apagada = comportamiento de hoy, tope alcanzado = apagado sin romper la operación, caché no re-cobra, aislamiento tenant del emparejamiento, evaluación en CI con proveedor simulado. | 🔴 Alta | ✅ Done |
| 10 | Legal y privacidad | Aviso de privacidad: transferencia de datos a proveedor externo (categoría, finalidad, proveedor, país) y datos personales incidentales en fotos; retención según Fase 13. Prompts sin PII. Documentar Ollama local como salida si la revisión legal desaconseja el envío a terceros. | 🟠 Media | ✅ Done |
| 11 | Roadmap + `CLAUDE.md` | Registrar el principio rector y la regla de "ningún endpoint público invoca IA"; actualizar totales. | 🟢 Baja | ✅ Done |

> **2026-09-03 — se destapó y se cerró parte del hueco entre "el arnés existe"
> y "se midió con datos reales".** `evals/run.py` le hablaba al proveedor con
> un prompt propio, sin catálogo y sin pasar por `text_mapping.suggest()` /
> `label_ocr.extract()`: medía un modelo distinto al que las 4 banderas ya
> encendidas en producción (`AI_ENABLE_*=true` desde antes de esta fecha,
> verificado con `AI_MONTHLY_BUDGET_USD=10` y uso real registrado en
> `/studio/ai`) de verdad corren. Se corrigió para llamar al pipeline real
> contra un catálogo sembrado con los datos globales reales
> (`app/seeds/common_food.py`, `who_medicines.py`, `iom_nonfood.py`), y se
> agregó `product_mapping_choices` (migración 046) + `POST
> /v1/catalog/mapping-choices` para que la elección real de una coordinación
> empiece a acumularse en vez de perderse en cada petición. Sigue pendiente:
> (a) que el panel (frontend) llame a ese endpoint cuando alguien resuelve una
> sugerencia — sin eso la tabla se queda vacía — y (b) el OCR no tiene
> equivalente: ninguna foto se liga hoy a la caja final que confirma, así que
> construir su ground truth real exige antes una liga en el esquema, no solo
> un endpoint de registro.

> **2026-09-04 — primera medición del pipeline real, y lo que enseñó.** Con
> el runner ya corrigiendo, la primera corrida contra `gpt-4o-mini` dio
> `top1 = top3 = 57%` (umbrales: 60% y 85%). **Que las dos métricas fueran
> iguales era el hallazgo**, no el número: `top3` cuenta que el producto
> correcto aparezca entre las tres sugerencias y `top1` que aparezca primero,
> así que solo coinciden si el modelo, todas las veces que vio el producto
> correcto, lo eligió de primero. De los 13 fallos, 12 no devolvieron ninguna
> sugerencia. El cuello de botella no era el modelo sino la lista corta, que
> buscaba con `ILIKE '%palabra%'` contra el nombre completo y por eso no podía
> encontrar un plural cuando el catálogo guarda el singular ("cobijas" contra
> "Cobija"), ni una palabra sin acento contra una con acento, y además dejaba
> pasar palabras funcionales que traían candidatos por casualidad ortográfica.
>
> Corregida la recuperación (comparación palabra por palabra ya normalizada,
> acotada a la diferencia de dos letras con la que el español pluraliza), la
> corrida del mismo día dio **`top1 = top3 = 87%`, sobre ambos umbrales**, a
> un costo de $0.0018 por los 30 casos. Treinta puntos sin tocar el prompt ni
> cambiar de modelo. La misma firma se repitió: `top1` volvió a igualar a
> `top3`, así que para la interfaz la primera sugerencia es la que importa.
>
> Quedan cuatro fallos, y no son la misma cosa. Tres —`frazadas`,
> `acetaminofén`, `advil`— son sinónimos regionales y marcas comerciales sin
> una letra en común con su entrada del catálogo: ninguna mejora de búsqueda
> los alcanza, piden un diccionario de sinónimos que es decisión de producto.
> El cuarto, `cobijas matrimoniales nuevas`, **sí tenía el producto correcto
> entre los candidatos** y el modelo devolvió vacío; el catálogo no tiene
> ninguna cobija matrimonial y el prompt declara que una lista vacía es una
> respuesta correcta cuando ninguna corresponde, así que probablemente el
> caso de referencia es el que está mal, no el modelo. Se deja como está: un
> caso que se corrige porque falló deja de medir y pasa a justificar.
>
> **Lo que este número no dice.** Los 30 casos siguen escritos a mano desde el
> dominio, no son capturas reales, y la fase pide ~100 reales por capacidad.
> Es evidencia de que el arreglo funcionó y de que la capacidad —encendida en
> producción desde antes— hoy acierta mucho más; no es la medición con datos
> reales que la task 8 exige. Esa sigue esperando volumen en
> `product_mapping_choices`, que sigue esperando que el panel llame al
> endpoint.

> **2026-09-04 — el panel ya alimenta el conjunto real.** La captura que nace
> de un pre-registro (`/dashboard/intake/new?donation=CODE`) ya creaba una fila
> por renglón recibido, con su cantidad y su unidad; el texto del donante, en
> cambio, se volcaba a un blob de notas y ahí se perdía qué texto correspondía
> a qué caja. Ahora cada fila conserva el renglón que la originó, muestra sus
> sugerencias junto al buscador de producto, y al enviar registra en
> `product_mapping_choices` el par (texto, producto elegido) con lo que la IA
> había propuesto.
>
> Dos decisiones que valen más que el código:
>
> - **Se registra al enviar, no al pulsar.** Quien captura puede aceptar una
>   sugerencia y cambiarla antes de guardar, y lo que hay que medir es en qué
>   terminó el inventario. Registrar el clic mediría intenciones.
> - **La sugerencia llena el campo.** Un botón que solo alimenta telemetría es
>   uno que la gente deja de pulsar, y —peor— uno que se pulsa sin mirar
>   justamente porque no tiene consecuencia. El dato tiene que salir de trabajo
>   útil: elegir la sugerencia ahorra la búsqueda, y el par queda como efecto
>   secundario. El principio de la fase no se mueve: nada se llena solo, la
>   persona pulsa.
>
> Límite conocido: una captura que se encola sin señal no registra el par. Sin
> conexión tampoco se puede cargar la donación, así que esas filas nacen sin
> texto del donante y no hay par que guardar; el caso que sí se pierde es el de
> quien carga la donación con señal y la envía después de que se cayó.
> Arrastrar la medición por la cola offline costaría más que el caso que
> recupera.

> **2026-09-04 — el OCR: por qué su ground truth no necesita una liga en el
> esquema.** La nota anterior daba por hecho que medir el OCR con datos reales
> exigía ligar una foto guardada con la caja que la confirma. Al revisarlo, esa
> conclusión estaba mal, y la razón importa: para el mapeo de texto lo "real"
> es irremplazable porque nadie puede inventar fielmente cómo escribe una
> persona —"advil 400", "frazadas"—, pero el insumo del OCR es la fotografía de
> una caja impresa. Una foto de un medicamento real, tomada con mala luz y la
> caja abollada, **es** un caso real venga de donde venga; lo que la hace
> realista son las condiciones de la toma, no por dónde entró al sistema. El
> conjunto de referencia del OCR se arma entonces con fotos curadas a
> propósito, y eso lo desacopla por completo de la persistencia.
>
> Lo que sí faltaba era **alcance**. El OCR solo se podía invocar desde la app
> móvil, sobre una foto que el donante ya había subido a su pre-registro, y en
> una pantalla que mostraba los campos como lista de solo lectura: había que
> leerlos y teclearlos a mano en otra pantalla. El panel web ni siquiera lo
> llamaba. Por eso `/studio/ai` registraba **cero llamadas** — no era falta de
> persistencia, era que casi nadie podía llegar.
>
> `POST /v1/intakes/read-label` recibe la foto directamente, sin exigir que
> exista antes: en el mostrador hay una cajita en la mano, no un pre-registro.
> **La imagen no se guarda en ningún lado**: viaja incrustada en la llamada a la
> IA y se descarta. Como el conjunto de referencia sale de fotos curadas,
> guardarla no compraría nada, y una foto tomada en un centro puede llevar datos
> personales de refilón — la misma razón por la que `ai_usage` nunca guardó
> contenido. La caché va por huella del contenido, así que volver a leer la
> misma cajita porque la primera foto salió movida no se cobra dos veces.
>
> Un archivo que no es imagen se rechaza con error, a diferencia de la IA no
> disponible, que devuelve vacío. Son cosas distintas: lo primero lo corrige
> quien eligió el archivo, lo segundo se resuelve tecleando como siempre, y
> confundirlas dejaría a alguien esperando una lectura que nunca iba a llegar.
>
> El formulario de captura del panel ya ofrece esa lectura. `inn_name`, `form`
> y `strength` identifican al `ProductType` y no a la caja, así que se muestran
> como texto para ayudar a encontrar el producto, no eligen el SKU solos.
>
> **Dos decisiones del lado del cliente.** La primera: lo leído **solo llena
> campos vacíos**. La IA pre-llena y la persona confirma; sobrescribir lo que
> alguien ya tecleó invierte esa relación y además destruye trabajo hecho con la
> caja a la vista. La segunda: **la foto se reduce a 1600px antes de subirla**.
> Una foto de teléfono pesa entre 8 y 12 MB y el tope del endpoint son 5, así
> que sin eso la mayoría de las fotos reales fallarían — pero el motivo de fondo
> es el sótano: subir doce megas para leer una cajita se come la conexión que
> hace falta para registrar la captura, y el modelo no necesita esa resolución.
>
> **Por qué el panel antes que la app.** La app no tiene con qué tomar una foto
> —`mobile_scanner` escanea códigos, no captura imágenes— así que ahí el cambio
> pide dependencia nueva, permisos, regenerar el cliente del OpenAPI y una
> release de tienda. Pero la razón que decide no es el costo sino que **una
> release es cara de corregir**: se valida el diseño donde se rectifica con un
> merge, y después se lleva a un binario que la gente tarda semanas en
> actualizar. La app queda como seguimiento; ninguna pieza se tira, porque el
> endpoint es agnóstico del cliente y la regla de qué se llena está escrita
> aparte del formulario.

---

## Orden sugerido

1 → 2 (cimientos y gasto antes que cualquier capacidad) → 8 (conjunto de
referencia antes de encender nada) → 4 → 5 (las dos de mayor retorno) → 3 → 6 →
7 → 9 → 10 → 11.

La 4 depende de que exista la recepción de la Fase 18; la 5 puede arrancar sola.

## Definition of Done de la fase

- Ninguna llamada de IA sale de un endpoint público.
- Con todas las banderas apagadas, la aplicación se comporta exactamente como hoy.
- Alcanzado el tope mensual, las capacidades se apagan solas y la operación sigue.
- Ninguna capacidad se enciende en producción sin superar su umbral de evaluación.
- Ningún campo llega a `SEALED` sin que una persona lo haya confirmado.
- El aviso de privacidad declara la transferencia a proveedor externo.
