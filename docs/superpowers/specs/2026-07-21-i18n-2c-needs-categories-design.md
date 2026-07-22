# Spec — i18n Sub-proyecto 2c: necesidades + categorías

**Fecha:** 2026-07-21 · **Estado:** aprobado
**Depende de:** Sub-1 (infra) + 2a/2b (patrón).

## Objetivo
Migrar `/necesidades` (hub "qué falta", con data en vivo) y las **7 landings** `/necesidades/[category]` al patrón i18n por URL, con la data editorial de `needs-categories.ts` traducida al inglés.

## Clave del diseño: categorías = set fijo → claves explícitas
`/necesidades/[category]` es una ruta dinámica, pero las **7 categorías son fijas**. Se enumeran como claves explícitas en `ROUTE_SLUGS` (cero cambios de infra; el middleware ya resuelve slugs anidados). El `[category]` físico es el **slug ES canónico**; el middleware traduce el EN → canónico.

## Rutas (agregar a `ROUTE_SLUGS`)
| Clave (ES) | EN |
|---|---|
| `necesidades` | `needs` |
| `necesidades/medicamentos` | `needs/medicine` |
| `necesidades/insumos-medicos` | `needs/medical-supplies` |
| `necesidades/alimentos` | `needs/food` |
| `necesidades/agua` | `needs/water` |
| `necesidades/higiene` | `needs/hygiene` |
| `necesidades/herramientas` | `needs/tools` |
| `necesidades/equipo-de-rescate` | `needs/rescue-gear` |

## `needs-categories.ts` bilingüe
Reestructurar a: `{ slug (ES, = param [category]), category (enum), emoji, es: {label, metaTitle, metaDescription, intro, accepted[], rejected[]}, en: {…} }`. Helpers: `findNeedsCategory(slug)` (por slug ES), `slugForCategory(enum)` (→ slug ES), `NEEDS_CATEGORIES` (para sitemap). Traducir las 7 categorías al inglés.

## Páginas
- `app/[lang]/necesidades/page.tsx` (hub): lee `params.lang`; data en vivo (`/v1/public/needs`, ISR); labels de categoría localizados; filas linkean a `localizedPath("necesidades/<esSlug>", locale)`; `alternates("necesidades", lang)`.
- `app/[lang]/necesidades/[category]/page.tsx`: `params.lang` + `params.category` (slug ES); `findNeedsCategory` → `notFound` si no existe; renderiza `entry[locale]` + total en vivo; `alternates("necesidades/<esSlug>", lang)`; crumbs localizados. Patrón ISR **sin generateStaticParams** (evita hang de build por el fetch, como el actual).
- **OG image**: la `opengraph-image.tsx` dinámica actual (data en vivo) se simplifica a la card genérica `ogImageUrl(...)` en el metadata del hub `[lang]` (evita mover el OG-con-fetch al árbol `[lang]`). Nota: se pierde la card con totales en vivo — aceptable; follow-up opcional.

## Otros
- Middleware matcher: +`/necesidades`, `/necesidades/:path*`, `/needs`, `/needs/:path*`.
- Sitemap: hub + 7 categorías con `alternates`. Borrar `app/necesidades` plano (incl. su `opengraph-image.tsx`).
- Cross-links internos a `/necesidades` (desde guías/pilares) → los EN quedan apuntando al slug ES vía middleware (308/rewrite) o se localizan donde sea trivial.

## Testing
`/necesidades` + `/necesidades/medicamentos` 200 ES; `/en/needs` + `/en/needs/medicine` 200 EN; slug inválido → 404; hreflang + `<html lang>`; build + tsc; mobile.

## Fuera de alcance
2d (eventos/qr/b), sub 3 (panel), sub 4 (manuales).
