# Fase 21 — Logística: pesaje por bulto, anexo Carta Porte y perfiles de paletizado

> El peso que rige en la cadena aérea es el bruto de báscula por tarima, no la
> suma de renglones: el pesaje se traslada a donde ocurre de verdad. El envío
> gana un anexo de datos Carta Porte 3.1 (insumo para quien timbra: Araguaney no
> se convierte en emisor fiscal) y las tarimas, perfiles de altura configurables
> porque no existe un estándar único (160 cm lower deck / arcos de 170–180 cm).
>
> **Spec:** `docs/superpowers/specs/2026-07-29-logistics-weighing-design.md`
> **Premisas validadas** contra fuentes de carga aérea (chargeable weight,
> alturas por aeronave), SAT/PACs (Carta Porte 3.1, excepciones 30 km/C2).
> **Gate:** la guía fiscal para centros no se publica sin revisión de fiscalista
> (la excepción por ayuda humanitaria, Regla 2.7.7 RMF, la confirma un
> profesional, no este roadmap).

---

## Objetivos

1. Quitarle al voluntario la captura de peso renglón por renglón: estimado
   pre-llenado por caja, báscula una sola vez por tarima.
2. Que manifiestos y documentos usen el peso que la cadena logística va a
   validar (bruto/tara/neto por tarima).
3. Producir el anexo de datos Carta Porte por envío, listo para el PAC del
   transportista o del centro.
4. Que una tarima no llegue al aeropuerto 20 cm más alta que el arco del handler.

## No-objetivos (MVP)

- Timbrado de CFDI o integración con PAC (decisión explícita: Araguaney no es
  emisor fiscal).
- Peso volumétrico y dimensiones de caja (se documenta en la guía; no se modela).
- Hardware de báscula conectado.

---

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Migración `03X`: pesaje y perfiles | `pallets.gross_weight_kg` (Numeric 8,3, nullable), `pallets.height_cm` (Integer, nullable), `shipments.height_profile` (String nullable + CHECK contra el catálogo de perfiles). Reversible. | 🟠 Media | ⬜ |
| 2 | Estimado de peso por caja | Intake pre-llena `weight_kg` con `unit_weight_kg × cantidad` cuando el catálogo lo tiene (editable). La UI lo marca como estimado. | 🟠 Media | ⬜ |
| 3 | Poblar `unit_weight_kg` del catálogo | Seed de pesos unitarios para los tipos más comunes (alimentos, agua, higiene: los de mayor volumen real en el escenario sembrado). Sin pretender exactitud farmacéutica: es un estimado para pre-llenar. | 🟠 Media | ⬜ |
| 4 | Cierre de tarima con báscula | El cierre pide peso bruto y altura (opcionales). Neto = bruto − tara; discrepancia vs suma de estimados visible y no bloqueante. `PalletEvent` registra el pesaje en la nota. | 🔴 Alta | ⬜ |
| 5 | Manifiestos con peso pesado | PDF y XLSX: totales por tarima (bruto/tara/neto) y por envío usan el peso de báscula cuando existe; columna por caja marcada como estimada. Extiende `test_pdf_documents`. | 🟠 Media | ⬜ |
| 6 | Anexo Carta Porte 3.1 (datos) | Export XLSX + JSON por envío con el mapeo del complemento de autotransporte: mercancías (descripción, clave producto-servicio SAT, cantidad, clave unidad, peso kg), bultos, peso bruto total, origen/destino. Encolado en ARQ, autenticado, rate-limited. Sin timbrado. | 🔴 Alta | ⬜ |
| 7 | Claves SAT en el catálogo | `product_types` gana clave producto-servicio SAT (columna nullable + seed para las categorías: la taxonomía UNSPSC ya existente es la base del mapeo c_ClaveProdServ). | 🟠 Media | ⬜ |
| 8 | Guía Carta Porte para centros (GATED fiscalista) | Manual en `/dashboard/ayuda` (ES/EN): quién emite según quién transporta (transportista → CFDI ingreso; medios propios → CFDI traslado), excepción 30 km / C2, valor cero no exime en tramo federal. Publicación tras revisión de fiscalista (Regla 2.7.7 RMF). | 🔴 Alta | ⬜ |
| 9 | Perfiles de altura en envíos | Selector de perfil al crear/editar envío (`LOWER_DECK_160`, `XRAY_170`, `MAIN_DECK_180`, `SIN_RESTRICCION`). Advertencia (no bloqueo) al cerrar o asignar tarimas que excedan el perfil. | 🟠 Media | ⬜ |
| 10 | Guía de paletizado | Manual en `/dashboard/ayuda`: alturas por escenario (la base de la tarima cuenta), flejado, esquineros, por qué el arco del handler puede ser más bajo que el avión. | 🟢 Baja | ⬜ |
| 11 | Tests | Neto/tara/discrepancia, manifiesto con pesado vs estimado, mapeo completo del anexo contra fixture, advertencias de perfil en ambos lados del límite, regresión de cierre sin báscula. | 🔴 Alta | ⬜ |
| 12 | Roadmap + `CLAUDE.md` | Totales y registro de la política "el peso de verdad vive en la tarima". | 🟢 Baja | ⬜ |

---

## Orden sugerido

1 → 4 → 5 (pesaje de verdad primero: es lo que desbloquea manifiestos útiles) →
2 → 3 (estimados) → 7 → 6 → 8 (Carta Porte) → 9 → 10 (alturas) → 11 → 12 (cierre).

## Definition of Done de la fase

- Cerrar una tarima pide báscula y altura una sola vez; nada de eso es
  obligatorio para operar.
- El manifiesto declara bruto/tara/neto por tarima con datos de báscula.
- El anexo Carta Porte de un envío se descarga con todas las mercancías
  mapeadas y cuadra con el manifiesto.
- La guía fiscal está revisada por fiscalista antes de ser visible.
- Un envío con perfil de 160 cm advierte al recibir una tarima de 175 cm y
  guarda silencio con una de 150 cm.
- Un centro que ignora todos los campos nuevos opera exactamente igual que hoy.
