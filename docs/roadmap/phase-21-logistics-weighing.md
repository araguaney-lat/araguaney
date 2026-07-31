# Fase 21 — Logística: pesaje por bulto, anexo Carta Porte y perfiles de paletizado

> El peso que rige en la cadena aérea es el bruto de báscula por bulto, no la
> suma de renglones: el pesaje se traslada a donde ocurre de verdad. El envío
> gana una **declaración de mercancías** universal —qué va, cuánto pesa, cuántos
> bultos, de dónde a dónde, con los datos que el propio centro capturó sobre sí
> mismo— y las tarimas, perfiles de altura configurables porque no existe un
> estándar único (160 cm lower deck / arcos de 170–180 cm).
>
> **Corregido durante la implementación:** el diseño original producía un anexo
> Carta Porte específico de México. Araguaney es software y opera en varios
> países: cubrir el régimen fiscal de cada uno es una carrera que se pierde
> sola, y nos pondría a opinar sobre reglas tributarias que no nos tocan. El
> documento es genérico, el código de mercancía es **HS** (el que usan casi 200
> países en aduana) y México queda como un perfil opcional que solo traduce
> nombres de campo.
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
| 1 | Migración `036`: pesaje y perfiles | `pallets.gross_weight_kg` (Numeric 8,3) y `pallets.height_cm`; `shipments.height_profile` con CHECK contra el catálogo de perfiles. Reversible, verificada up/down/up contra una base limpia. | 🟢 Baja | ✅ Done |
| 2 | Peso de la caja y referencia del catálogo | La caja **se pesa** ya cerrada: su peso incluye cartón, empaque y relleno, así que nunca es la suma de sus productos. El catálogo se muestra al lado como referencia ("solo el contenido pesaría ~X kg") para cachar un dedazo, y **no** llena el campo: un estimado que se hace pasar por medición es peor que un campo vacío. | 🟠 Media | ✅ Done |
| 3 | Poblar `unit_weight_kg` del catálogo | `app/seeds/unit_weights.py` con 62 pesos de referencia (alimentos, higiene, agua) y migración `037` que **solo llena lo vacío**: si un centro curó el peso de un producto, ese valor manda. Son tamaños comerciales típicos, no medición: el número existe para comparar órdenes de magnitud y cachar un dedazo. Los recipientes de agua pesan **vacíos**, que es el error más fácil de sembrar mal. | 🟠 Media | ✅ Done |
| 4 | Cierre de tarima con báscula | El cierre pide peso bruto y altura, ambos opcionales — una báscula descompuesta no puede impedir cerrar una tarima ya armada. Neto = bruto − tara. El detalle muestra la suma de las cajas pesadas y su diferencia contra el neto: se espera positiva y pequeña (base y emplaye); negativa señala una caja mal pesada o una tara alta, y se avisa. | 🟠 Media | ✅ Done |
| 5 | Manifiestos con peso pesado | Bruto/tara/neto y altura por tarima; el total del envío usa el neto de la tarima y declara cuántas se pesaron, cayendo a la suma de cajas solo donde no hubo báscula. Ningún total mezclado se presenta sin decir que es mixto. | 🟠 Media | ✅ Done |
| 6 | Declaración de mercancías (universal) | Export XLSX + JSON por envío, encolado en ARQ y rate-limited. Lleva lo que sí sabemos —qué va, cuánto pesa, cuántos bultos, origen y destino— más la identidad que el centro capturó de sí mismo. Un dato que no tenemos se declara faltante, nunca se inventa: el archivo abre con la lista de lo que falta. **Perfil de país opcional** (`MX_CARTA_PORTE`) que solo traduce nombres de campo: no siembra códigos, no valida formatos y no explica reglas fiscales, y hay test que lo fija. | 🔴 Alta | ✅ Done |
| 7 | Código de mercancía en el catálogo | `product_types.hs_code` (Sistema Armonizado de la OMA), no una clave de un solo régimen: la carga cruza fronteras y el HS lo usan casi 200 países. `centers` gana razón social e identificación fiscal, que captura el national_admin y Araguaney solo imprime — sin validar formato, porque un RFC, un RIF y un EIN no se parecen. Migración `039`. | 🟠 Media | ✅ Done |
| 8 | Guía de documentos de transporte | `content/manuals/documentos-de-transporte.html` (ES/EN) en `/dashboard/ayuda`: qué genera la plataforma (manifiesto, declaración de mercancías, etiquetas), qué datos captura el centro sobre sí mismo y qué le toca al despachante. Sin orientación tributaria y por lo tanto **sin gate de fiscalista**. Cierra invitando a pedir un perfil de país si hace falta, y dejando claro que no interpretamos reglas por nadie. | 🟢 Baja | ✅ Done |
| 9 | Perfiles de altura en envíos | Selector al crear el envío (`LOWER_DECK_160`, `XRAY_170`, `MAIN_DECK_180`, `SIN_RESTRICCION`, constantes en código). La advertencia se calcula al leer el detalle —cambiar el perfil no toca ninguna tarima— y nunca bloquea: quien está en el andén ve la tarima y el sistema no. | 🟠 Media | ✅ Done |
| 10 | Guía de paletizado | `content/manuals/paletizado.html` (ES/EN) en `/dashboard/ayuda`: alturas por escenario empezando por que **la base de la tarima se come ~15 cm**, el arco de rayos X que puede ser más bajo que la puerta del avión, apilado en columna contra ladrillo, nada fuera del borde, y emplaye anclado a la tarima con esquineros bajo el fleje. | 🟢 Baja | ✅ Done |
| 11 | Tests | Neto/tara/diferencia, manifiesto con tarima pesada vs suma de cajas, perfil de altura en ambos lados del límite y cierre sin báscula ya estaban. Se cubre lo que faltaba y era lo más delicado: `_build_declaration_data` contra SQLite real — agrupación de cajas del mismo producto repartidas en tarimas distintas, suma de cantidades y pesos, bruto desde los netos de tarima, bultos, emisor desde el centro y perfil desde el envío. | 🔴 Alta | ✅ Done |
| 12 | Roadmap + `CLAUDE.md` | Registra las dos políticas de la fase: "el peso de verdad vive en la tarima" (tres niveles, dos medidos) y la frontera multi-país (los datos son nuestros, las reglas no). Totales actualizados. | 🟢 Baja | ✅ Done |

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
