# Spec — Landings por escenario (Cluster F) — Fase 17 task 11

**Fecha:** 2026-07-24
**Fase roadmap:** 17 — AEO/GEO, task 11 (Cluster F — escenarios evergreen).

## Objetivo

Landings evergreen, agnósticas de país, para los tipos de emergencia más buscados
(inundaciones, incendios, crisis migratoria, sismo). Capturan búsquedas tipo "software para
acopio por inundaciones" y mapean al pilar `/ayuda-humanitaria` y a `/necesidades`. Distintas
de `/eventos/[slug]` (campañas efímeras).

## Decisiones (confirmadas con el usuario)

1. **Ruta única dinámica** `/escenarios/[scenario]` (EN `/scenarios/[scenario]`), mirroreando el
   precedente `/necesidades/[category]` (data file + ISR, sin `generateStaticParams`).
2. **4 escenarios:** inundaciones, incendios, crisis-migratoria, sismo.
3. **Idiomas:** ES + EN.

## Ruta y mecánica (idéntica a `/necesidades/[category]`)

- Data file `src/lib/scenarios.ts`: `SCENARIOS` (slug ES canónico + copy bilingüe) + `findScenario(slug)`.
- Cada escenario como `RouteKey` en `routes.ts`:
  - `escenarios/inundaciones` → en `scenarios/floods`
  - `escenarios/incendios` → en `scenarios/fires`
  - `escenarios/crisis-migratoria` → en `scenarios/migration-crisis`
  - `escenarios/sismo` → en `scenarios/earthquake`
- Matcher (`middleware.ts`): `/escenarios/:path*` + `/scenarios/:path*`. El middleware reescribe el
  slug EN al canónico ES, así que el param `[scenario]` siempre llega como slug ES.
- Página `app/[lang]/escenarios/[scenario]/page.tsx`: `export const revalidate = 300`, sin
  `generateStaticParams`, `notFound()` si el slug no existe; deriva `key = escenarios/${entry.slug}`
  para `alternates`/hreflang/breadcrumbs.

## Estructura por escenario

1. **Hero** — H1 + lead específicos.
2. **Qué se necesita** — 3-4 categorías típicas del desastre con un "por qué" propio, enlazando a
   `/necesidades/[categoría]` (label reusado de `NEEDS_CATEGORIES`).
3. **Cómo ayuda Araguaney** — el estándar en breve (registro por ítem → caja/QR → manifiesto → panel).
4. **CTA + cross-links** → `/ayuda-humanitaria` y `/necesidades`.

Categorías por escenario:
- inundaciones → agua, higiene, medicamentos, alimentos
- incendios → equipo-de-rescate, herramientas, higiene, insumos-medicos
- crisis-migratoria → higiene, alimentos, agua, medicamentos
- sismo → equipo-de-rescate, medicamentos, agua, herramientas

## Structured data

- `BreadcrumbList` (Inicio → Ayuda humanitaria → [escenario]).

## Plomería / internal linking

- `sitemap.ts`: map sobre `SCENARIOS` (priority 0.7, monthly, hreflang).
- `llms.txt` + `llms-full.txt`: sección/enlaces a los 4 escenarios.
- Enlace desde el pilar `/ayuda-humanitaria` a los escenarios.

## No-objetivos

- No confundir con `/eventos/[slug]` (efímero por campaña); estos son evergreen.
- Sin backend nuevo (contenido fijo; el "qué se necesita" enlaza, no consulta stock).
- Sin componentes nuevos.

## Definition of Done

- Los 4 escenarios ES + EN renderizan; slug inválido → 404 (`notFound`).
- `routes.ts` (4 keys) + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + enlace en el pilar.
- `BreadcrumbList`; canonical/hreflang correctos.
- `tsc` y build verdes; verificado corriendo la app (ES/EN 200 por escenario, 404 en slug inválido).
- Roadmap Fase 17 task 11 → Done; README actualizado.
