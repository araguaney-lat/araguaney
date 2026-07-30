# IA asistida: captura, catálogo y necesidades — Diseño

**Fecha:** 2026-07-29
**Fase:** 23 (`docs/roadmap/phase-23-ai-assisted-capture.md`)
**Estado:** aprobado en sesión de diseño
**Relación:** el mapeo de texto libre alimenta la recepción de la Fase 18; el OCR
alimenta el intake y el catálogo que aprende (Fase 19). Ninguna es bloqueante:
la fase degrada a la operación actual si se apaga.

---

## El principio rector

> **La IA pre-llena, la persona confirma. Nada se sella con un dato que nadie miró.**

De ahí se derivan todas las decisiones: un error del modelo es fricción, nunca
inventario corrupto. Ningún campo llega a `SEALED` sin pasar por un humano, y
toda sugerencia es editable antes de guardarse.

## Qué se descartó, y por qué

| Idea evaluada | Veredicto |
|---|---|
| **Estimar volumen o peso desde una foto** | ❌ No viable. Sin referencia de escala no hay estimación de volumen, y el peso depende del contenido, no de la forma. Además ya existen dos fuentes mejores: `unit_weight_kg × cantidad` y la báscula de la Fase 21, que es la verdad |
| **Contar objetos en una foto** | ❌ No confiable. La literatura mide ~0.60 de exactitud contando un solo tipo de objeto y ~0.45 con varios (*"Your VLM Can't Even Count to 20"*, 2025). Los sistemas que llegan a 95-99% son visión especializada sobre banda transportadora, no un teléfono en un almacén |
| **Leer texto de una etiqueta** | ✅ Sí. OCR de empaque farmacéutico es tecnología madura, con literatura específica de extracción de lote y caducidad |
| **Chatbot** | ❌ Fuera de alcance. No resuelve el cuello de botella, que es la captura |

## Las cuatro capacidades

### 1. Mapear texto libre a catálogo (la de mayor retorno)

La Fase 18 permite al donante escribir "20 latas de atún" o "3 cobijas". Alguien
tiene que convertir eso en `product_type_id` durante la recepción. Es
clasificación de texto corto contra el catálogo: los modelos son excelentes en
esto y cuesta fracciones de centavo.

**Sin esto, la Fase 18 le pasa el trabajo manual del donante al coordinador.**

El flujo: al abrir la recepción, cada renglón de texto libre llega con 3
sugerencias ordenadas por confianza; el coordinador elige una, busca otra o crea
el tipo. La elección alimenta el catálogo que aprende (Fase 19).

### 2. OCR de etiqueta de medicamento

`validation_service.py` exige `inn_name`, `form`, `strength`, `batch` y
`expiry_date` para sellar una caja de medicina. Hoy eso es un voluntario
tecleando de una cajita en letra de 6 puntos, y es la causa más común de cajas
que no se pueden sellar.

Foto → campos pre-llenados, **todos editables**, marcados visualmente como
sugeridos hasta que la persona los confirma. La caducidad se valida con la regla
de 365 días que ya existe.

**Librería vs. modelo:** el OCR clásico (Tesseract, PaddleOCR) es gratis y lee
texto, pero devuelve cadenas sueltas; decidir cuál es el lote y cuál la
concentración es el trabajo real, y ahí es donde el modelo de visión gana. Para
el volumen esperado (cientos de cajas por emergencia) la llamada directa al
modelo es más simple y cuesta ~$0.0002 por foto.

### 3. Emparejar necesidades con stock

`requests` es `title` + `description` en texto libre; el stock está estructurado
por categoría e INN. Cruzar "necesitamos analgésicos pediátricos" contra el
inventario nacional es un problema semántico, no de SQL. Convierte un tablón de
anuncios en un sistema de asignación: la solicitud muestra qué centros tienen
algo compatible y en qué cantidad.

### 4. Resumen del agregado nacional

Un párrafo generado sobre las cifras que el panel ya calcula, para prensa,
donantes institucionales o reportes. Barato, sin datos personales de por medio y
muy visible.

## Costo: el riesgo no es el precio unitario

Precios de referencia por millón de tokens (julio 2026):

| Modelo | Entrada / Salida | Visión |
|---|---|---|
| Qwen2.5-VL-7B | $0.05 | ✅ |
| Gemini 2.5 Flash-Lite | $0.10 / $0.40 | ✅ |
| Llama 4 Scout | $0.18 / $0.59 | ✅ |
| GPT-5 mini | $0.25 / $2.00 | ✅ |
| Claude Haiku 4.5 | $1.00 / $5.00 | ✅ |
| DeepSeek V3 | $0.01 / $0.03 | ❌ solo texto |

Con un modelo del tramo económico, mapear un renglón cuesta ~$0.00007 y leer una
foto ~$0.0002. **Diez mil operaciones al mes salen por menos de dos dólares.**

**El riesgo real es el volumen no controlado, no el precio.** Cinco controles:

1. **Ningún endpoint público invoca IA.** `/donar` (Fase 18) es público: una
   función medida ahí es un ataque de costo (EDoS, `CLAUDE.md` §9). El mapeo de
   texto libre corre en la **recepción**, que es autenticada. Sin excepciones.
2. **Tope mensual con interruptor.** `AI_MONTHLY_BUDGET_USD`: al alcanzarlo, las
   funciones de IA se apagan solas y la app sigue operando como hoy. El gasto
   acumulado se registra por llamada.
3. **Rate limiting por usuario y por centro**, sobre el `slowapi` existente.
4. **Caché de resultados.** El mismo texto libre o la misma foto no se paga dos
   veces (Redis, patrón `app.utils.cache`).
5. **Banderas por capacidad.** Cada una de las cuatro se prende y apaga sola;
   todas apagadas = la app de hoy, sin ninguna ruta muerta.

## Proveedor: sin amarre

El boilerplate ya trae la capa **OpenAI-compatible con `AI_BASE_URL`
configurable** (`docs/optional-layers.md`), así que Gemini, DeepSeek, Groq,
Together, Mistral u **Ollama local** entran cambiando variables de entorno.

El diseño mantiene esa neutralidad: un adaptador delgado con la interfaz que la
app necesita (`clasificar_texto`, `extraer_de_imagen`, `resumir`), y el modelo
como configuración, no como dependencia de código. Empezar por el tramo
económico y medir; subir de tramo solo donde la evaluación lo justifique.

**Ollama local** merece mención aparte: costo marginal cero y los datos no salen
de la máquina, a cambio de operar el servidor. Es la salida si el presupuesto
llega a cero o si la evaluación legal desaconseja mandar fotos a terceros.

## Evaluación: sin medición no hay fase

Una sugerencia mala que nadie mide degrada el catálogo en silencio. Antes de
encender cualquier capacidad en producción:

- **Conjunto de referencia** de ~100 casos por capacidad (renglones de texto
  libre con su `product_type` correcto; fotos de caja con sus campos correctos),
  construido con datos reales del escenario sembrado.
- **Métrica declarada**: acierto en top-1 y en top-3 para el mapeo; exactitud
  por campo para el OCR.
- **Umbral de encendido**: si una capacidad no supera su umbral, no se activa.
  El umbral se fija al construir el conjunto, no después de ver los resultados.
- La evaluación corre contra el proveedor configurado, así que sirve también
  para comparar modelos por costo y calidad.

## Privacidad y legal

- **Mandar fotos a un proveedor externo es una transferencia de datos** que el
  aviso de privacidad debe declarar (categoría, finalidad, proveedor,
  país). Se suma a las fases 18-20, que ya introducen PII de donante.
- Las fotos de donación pueden contener datos personales incidentales (una
  receta, un nombre en una caja). El aviso debe cubrirlo y la retención seguir
  la tabla de la Fase 13.
- **Nada de PII en los prompts**: el mapeo manda el texto del renglón, nunca el
  nombre ni el email del donante.
- Si la revisión legal desaconseja el envío a terceros, la salida es Ollama
  local sin cambiar código de aplicación.

## Qué NO entra

- Chatbot o asistente conversacional.
- Estimación de volumen, peso o conteo desde foto (descartado arriba).
- Decisiones automáticas: nada se sella, rechaza, asigna ni despacha sin humano.
- Triage automático de banderas rojas de la Fase 20: un falso positivo acusa a
  alguien de lavado. Queda anotado como posible v2, con revisión humana
  obligatoria.
- Entrenamiento o afinado de modelos propios.

## Testing

- El adaptador con un doble: la app no llama a la red en pruebas.
- Cada capacidad con la bandera apagada: comportamiento idéntico al de hoy.
- Tope de presupuesto alcanzado: las funciones se apagan y la operación continúa.
- Caché: la segunda llamada con la misma entrada no consume presupuesto.
- Aislamiento tenant en el emparejamiento de necesidades (`tests/tenant/`).
- El conjunto de evaluación corre en CI como prueba de no-regresión, con
  proveedor simulado para no gastar en cada PR.
