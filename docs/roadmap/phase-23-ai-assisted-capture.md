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
| 3 | Panel de gasto | Consumo del mes por capacidad, visible para `superadmin` en `/studio`, con el estado del interruptor. | 🟢 Baja | ⬜ |

### Capacidades

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 4 | Mapeo de texto libre → catálogo | En la recepción (Fase 18, autenticada): cada renglón de texto libre llega con 3 sugerencias por confianza; el coordinador elige, busca o crea. La elección alimenta el catálogo que aprende (Fase 19). | 🔴 Alta | ⬜ |
| 5 | OCR de etiqueta de medicamento | Foto → `inn_name`, `form`, `strength`, `batch`, `expiry_date` pre-llenados, editables y marcados como sugeridos hasta confirmarse. La caducidad pasa por la validación de 365 días existente. | 🔴 Alta | ⬜ |
| 6 | Necesidades ↔ stock | La solicitud muestra qué centros tienen inventario compatible y en qué cantidad. Scoped por tenant: un centro no descubre el stock de otro salvo `national_admin`. | 🟠 Media | ⬜ |
| 7 | Resumen del agregado nacional | Párrafo generado sobre las cifras que el panel ya calcula, para prensa y donantes institucionales. Sin datos personales en el prompt. | 🟢 Baja | ⬜ |

### Evaluación, pruebas y cierre

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 8 | Conjunto de referencia y umbrales | ~100 casos por capacidad con datos reales; métricas declaradas (top-1 y top-3 para mapeo, exactitud por campo para OCR); umbral de encendido fijado **antes** de ver resultados. Sirve además para comparar modelos por costo y calidad. | 🔴 Alta | ⬜ |
| 9 | Tests | Adaptador con doble (sin red en pruebas), bandera apagada = comportamiento de hoy, tope alcanzado = apagado sin romper la operación, caché no re-cobra, aislamiento tenant del emparejamiento, evaluación en CI con proveedor simulado. | 🔴 Alta | ⬜ |
| 10 | Legal y privacidad | Aviso de privacidad: transferencia de datos a proveedor externo (categoría, finalidad, proveedor, país) y datos personales incidentales en fotos; retención según Fase 13. Prompts sin PII. Documentar Ollama local como salida si la revisión legal desaconseja el envío a terceros. | 🟠 Media | ⬜ |
| 11 | Roadmap + `CLAUDE.md` | Registrar el principio rector y la regla de "ningún endpoint público invoca IA"; actualizar totales. | 🟢 Baja | ⬜ |

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
