# Spec — Página comparativa "Alternativa a Excel para donaciones" (Fase 17, task 10)

**Fecha:** 2026-07-24
**Fase roadmap:** 17 — AEO/GEO + expansión de keywords, task 10 (Cluster E, intención comercial).

## Objetivo

Publicar una página pilar de **intención comercial / fondo de embudo** que capture las
búsquedas "alternativa a Excel para donaciones" y "mejor software para centro de acopio",
comparando Araguaney contra el método ad-hoc real que usan los centros hoy
(**hoja de cálculo / Google Sheets / WhatsApp / papel**) — **sin nombrar competidores de
software** (cero riesgo factual/legal). La tabla comparativa es el centro de la estrategia
AEO: los motores de IA extraen tablas con facilidad.

## Decisiones (confirmadas con el usuario)

1. **Contra qué se compara:** Excel / hoja de cálculo / WhatsApp. No se nombran competidores.
2. **Alcance:** una sola página pilar (concentra autoridad), que además responde "por qué es
   el mejor software para centro de acopio" en una sección/FAQ.
3. **Idiomas:** ES + EN (bilingüe, con hreflang), como el resto de los pilares.

## Ruta

- Nueva `RouteKey` en `src/lib/routes.ts`:
  - ES: `alternativa-a-excel-para-donaciones`
  - EN: `donation-spreadsheet-alternative`
- Página en `app/[lang]/alternativa-a-excel-para-donaciones/page.tsx` (el folder = slug ES
  canónico; el middleware reescribe el slug EN, igual que los demás pilares).

## Estructura de la página (patrón `CONTENT: Record<Locale, Content>`)

Sigue exactamente el patrón de `app/[lang]/centro-de-acopio/page.tsx`: copy inline por locale,
`generateMetadata` con `alternates(KEY, lang)` + `ogImageUrl`, `JsonLd` con `faqSchema` +
`breadcrumbSchema`, componentes `HomeNav` / `HomeFooter` / `CtaLink` / `FaqSection` /
`Breadcrumbs`, paleta cálida (`#FBF7EE`, CTA `#1F5E8C`, títulos serif).

Secciones:

1. **Hero** — eyebrow, H1, párrafo, CTA a `registrar-centro`.
2. **El problema con Excel / Sheets / WhatsApp** — narrativa del dolor: sin trazabilidad,
   sin QR/etiqueta, sin manifiesto, sin validación de caducidad/OMS, sin agregación nacional,
   caos de versiones y errores manuales.
3. **Tabla comparativa** (centro AEO) — filas = capacidades; columnas = *Hoja de cálculo /
   WhatsApp* vs *Araguaney*. `<table>` semántica dentro de un contenedor con
   `overflow-x: auto` para móvil. Filas (≈10):
   - Registro por ítem (categoría, lote, caducidad)
   - Validación de caducidad / reglas OMS
   - Bloqueo de medicamentos controlados
   - QR + etiqueta por caja
   - Manifiesto / packing list exportable
   - Trazabilidad caja → tarima → envío
   - Panel nacional agregado en tiempo real
   - Coordinación multi-centro
   - Sin datos personales (privacidad)
   - Costo (gratis)
4. **¿Cuándo alcanza una hoja de cálculo?** — sección honesta: acopio chico y puntual → la
   hoja sirve; multi-centro / aduana / escala → hace falta el estándar. Suma E-E-A-T, evita
   tono de folleto.
5. **FAQ** (`FaqSection` + `faqSchema`) — "¿Excel sirve para gestionar donaciones?",
   "¿cuál es el mejor software para un centro de acopio?", costo, cómo migrar desde una hoja.
6. **CTA final + cross-links** ↔ `/centro-de-acopio` y `/guias/software-gratis-para-gestionar-donaciones-ong`.

## Plomería SEO

- `routes.ts`: key + slugs ES/EN.
- `sitemap.ts`: entrada con `priority: 0.85`, `changeFrequency: "monthly"`, `alternates` hreflang.
- `public/llms.txt` + `public/llms-full.txt`: enlace a la nueva página.
- Structured data: `FAQPage` + `BreadcrumbList` (vía `JsonLd`). **Sin schema para la tabla**
  (no hay tipo schema.org bien soportado; la tabla HTML limpia + `FAQPage` es lo que consume
  la IA). YAGNI.
- Internal linking recíproco: `/centro-de-acopio` y la guía "software gratis" enlazan a esta
  página; esta enlaza de vuelta a ambas.
- `alternates(KEY, lang)` da canonical + hreflang ES/EN + x-default.

## No-objetivos

- No nombrar ni comparar competidores de software.
- No crear componentes compartidos nuevos (la tabla vive inline en la página; un solo pilar
  no justifica abstracción).
- No tocar el backend (página 100% estática/SSR de contenido fijo).

## Definition of Done

- Página ES + EN renderiza con hero, problema, tabla comparativa responsive, sección "cuándo
  alcanza", FAQ y CTA/cross-links.
- `routes.ts`, `sitemap.ts`, `llms.txt`, `llms-full.txt` actualizados.
- `FAQPage` + `BreadcrumbList` válidos; canonical/hreflang correctos.
- Internal links recíprocos en su lugar.
- `tsc` y build de producción verdes.
- Roadmap Fase 17 task 10 → Done; README actualizado.
