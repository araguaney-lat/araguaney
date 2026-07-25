# Spec — Página /nosotros (entity home / about) — Fase 17 task 7

**Fecha:** 2026-07-24
**Fase roadmap:** 17 — AEO/GEO, task 7.

## Objetivo

Publicar la página **about / entity home** de Araguaney: un ancla de entidad indexable que
refuerza E-E-A-T y consolida la señal de knowledge graph. Es el destino natural del
`ORGANIZATION_SCHEMA` (con `sameAs`/`founder`/`foundingDate` de la task 5) y de las bylines de
guías (task 9, posterior).

## Decisiones (confirmadas con el usuario)

1. **Founder:** nombre + rol en una línea ("Fundado en 2026 por Antony E Delgado Casanova" + una
   frase de rol/misión). Sin bio personal ni foto.
2. **Idiomas:** ES + EN (bilingüe, hreflang), como el resto de los pilares.
3. Sin componentes compartidos nuevos (copy inline, patrón `CONTENT: Record<Locale, Content>`).

## Ruta

- Nueva `RouteKey` en `src/lib/routes.ts`: `nosotros` → es `nosotros`, en `about`.
- Añadir ambos slugs al `config.matcher` de `src/middleware.ts` (necesario para el slug ES sin
  prefijo — si no, 404, como se descubrió en la task 10).
- Página en `app/[lang]/nosotros/page.tsx` (patrón pilar).

## Estructura (patrón de `app/[lang]/centro-de-acopio/page.tsx`)

`generateMetadata` con `alternates(KEY, lang)` + `ogImageUrl`; `JsonLd`; `HomeNav`/`HomeFooter`/
`CtaLink`/`Breadcrumbs`; paleta cálida.

Secciones:
1. **Hero** — eyebrow "Nosotros", H1 (misión), lead.
2. **Por qué existe Araguaney** — narrativa del problema (centros dispersos, sin estándar común,
   envíos que se atoran).
3. **Cómo lo hacemos** — el estándar en breve: registro por ítem → caja homogénea con QR →
   tarima/envío con manifiesto → panel nacional agregado.
4. **Estándares que respaldamos** — WHO, IFRC/ICRC, IOM, UNSPSC, GS1 (E-E-A-T).
5. **Privacidad por diseño** — sin datos personales de donantes ni beneficiarios; solo inventario.
6. **Founder** — una línea: "Fundado en 2026 por Antony E Delgado Casanova" + frase de rol.
7. **CTA + cross-links** — sumar mi centro / contacto; enlaces a `/centro-de-acopio` y
   `/como-funciona`.

## Structured data

- Emite `ORGANIZATION_SCHEMA` (entity home) — el mismo builder ya enriquecido en la task 5.
- `AboutPage` schema con `mainEntity` → Organization (nuevo builder `aboutPageSchema` en
  `structured-data.ts`, o inline). Mantendrá `url`/`inLanguage`.
- `BreadcrumbList`.

## Plomería SEO / internal linking

- `sitemap.ts`: entrada `priority 0.6`, `changeFrequency monthly`, hreflang.
- `public/llms.txt` + `llms-full.txt`: enlace a `/nosotros`.
- **Footer** (`HomeFooter.tsx`): añadir enlace a `/nosotros` (descubribilidad + internal linking).
- `alternates(KEY, lang)` → canonical + hreflang ES/EN + x-default.

## No-objetivos

- No bio personal ni foto del founder.
- No mover `ORGANIZATION_SCHEMA` del home (puede vivir en ambos; Google dedupe por url/@id).
- Sin backend.

## Definition of Done

- `/nosotros` (ES) y `/about` (EN) renderizan las 7 secciones.
- `routes.ts` + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + footer link.
- `Organization` + `AboutPage` + `BreadcrumbList` en el JSON-LD; canonical/hreflang correctos.
- `tsc` y build de producción verdes; verificado corriendo la app (ES/EN 200, schema presente).
- Roadmap Fase 17 task 7 → Done; README actualizado.
