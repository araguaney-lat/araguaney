# Spec — i18n Sub-proyecto 2b: guías + glosario

**Fecha:** 2026-07-21 · **Estado:** aprobado
**Depende de:** Sub-1 (infra) + 2a (patrón de páginas de contenido bilingües).

## Objetivo
Migrar el hub `/guias`, las 6 guías y `/glosario` al patrón i18n por URL, con **traducción EN completa** de toda la prosa. Es el chunk de mayor volumen de traducción.

## Rutas (agregar a `ROUTE_SLUGS`) — slugs traducidos (clave = slug ES completo)
| Clave | EN |
|---|---|
| `guias` | `guides` |
| `guias/como-organizar-un-centro-de-acopio` | `guides/how-to-organize-a-collection-center` |
| `guias/que-se-puede-donar` | `guides/what-can-be-donated` |
| `guias/como-preparar-carga-humanitaria-para-aduana` | `guides/how-to-prepare-humanitarian-cargo-for-customs` |
| `guias/como-registrar-voluntarios-en-un-centro-de-acopio` | `guides/how-to-register-volunteers` |
| `guias/software-gratis-para-gestionar-donaciones-ong` | `guides/free-donation-software-for-ngos` |
| `guias/sistema-de-inventario-para-damnificados` | `guides/inventory-system-for-disaster-relief` |
| `glosario` | `glossary` |

*(La infra ya soporta slugs anidados: `localizedPath`/`resolveSlug` tratan el slug como string.)*

## Enfoque
- Cada página → `app/[lang]/<clave>/page.tsx` bilingüe (contenido por `params.lang`), con:
  - `alternates(clave, lang)` (hreflang), `localizedPath` en switcher (`HomeNav`)/crumbs/cross-links.
  - JSON-LD localizado por locale: `articleSchema`, `howToSchema`, `faqSchema`, `breadcrumbSchema` (guías) y `definedTermSetSchema` (glosario).
- **Traducir al inglés** toda la prosa: guías (h1, intro, secciones h2, pasos HowTo/FAQ, CTA) y las 16 definiciones del glosario.
- **Hub `/guias`**: array de guías con `title`/`desc` por locale; los `href` de las tarjetas usan `localizedPath(clave, locale)`.
- Cross-links entre guías y hacia pilares migrados → `localizedPath`.
- **Borrar** las 8 páginas planas. Sitemap: reemplazar las entradas por versiones con `alternates`. Middleware `matcher`: +`/guias`, `/guias/:path*`, `/glosario`, `/guides`, `/guides/:path*`, `/glossary`.

## SEO
Las guías/glosario eran ES-only (sin gemela EN), así que no hay URLs EN viejas que redirigir. Las URLs ES actuales (`/guias/…`, `/glosario`) se preservan (el middleware reescribe a `/es/…`).

## Testing
`/<slug-es>` 200 ES · `/en/<slug-en>` 200 EN · hreflang es+en+x-default + canonical · `<html lang>` · build + tsc · mobile ES/EN.

## Fuera de alcance
2c (categorías + necesidades), 2d (eventos/qr/b), sub 3 (panel), sub 4 (manuales).
