# Spec — i18n Sub-proyecto 2a: pilares + legales + contacto

**Fecha:** 2026-07-21 · **Estado:** aprobado
**Depende de:** Sub-proyecto 1 (infra `routes.ts` / middleware / `app/[lang]` / `alternates`).

## Objetivo
Migrar 5 páginas públicas al patrón i18n por URL (sub-1), con paridad ES/EN y hreflang.

## Rutas (agregar a `ROUTE_SLUGS`)
| Clave (ES) | Slug ES | Slug EN | Contenido EN |
|---|---|---|---|
| `ayuda-humanitaria` | ayuda-humanitaria | humanitarian-aid | ya existe (merge de `app/humanitarian-aid`) |
| `como-funciona` | como-funciona | how-it-works | traducir |
| `aviso-de-privacidad` | aviso-de-privacidad | privacy | ya existe (`content/legal/privacy.en`) |
| `terminos` | terminos | terms | ya existe (`content/legal/terms.en`) |
| `contacto` | contacto | contact | traducir |

## Trabajo
- **Merge (sin traducir):** ayuda-humanitaria (ES+EN ya escritos en las páginas gemelas), aviso-de-privacidad y terminos (DOC ES/EN ya en `content/legal/`). Crear una página `app/[lang]/<clave>/page.tsx` bilingüe que elige contenido por `params.lang`.
- **Traducir:** `como-funciona` (copy nativo JSX) y `contacto`.
- Cada página: `generateMetadata` con `alternates(clave, lang)` + OG; `HomeNav`/`HomeFooter`/`LegalDoc` con `localeLinks = {es, en}` (switcher navega URL); crumbs/JSON-LD localizados con `localizedPath`.
- **Borrar** las páginas planas/duales: `app/{ayuda-humanitaria, humanitarian-aid, como-funciona, aviso-de-privacidad, privacy, terminos, terms, contacto}`.

## SEO / convivencia
- Las URLs EN viejas sin prefijo (`/humanitarian-aid`, `/privacy`, `/terms`) → el middleware las canonicaliza con **308** a `/en/…` (equity preservado).
- Middleware `matcher`: agregar los slugs ES + EN de las 5 (o migrar a matcher amplio — decisión: ampliar la lista explícita).
- Cross-links internos que apuntan a estas páginas (home, guías, centro-de-acopio, footer legal) → actualizar a `localizedPath` donde aplique; los no migrados quedan como están.
- Sitemap: `alternates.languages` para las 5.

## Testing
- `/<slug-es>` → 200 ES; `/en/<slug-en>` → 200 EN; viejas EN sin prefijo → 308.
- hreflang es+en+x-default + canonical; `<html lang>`; build + tsc; mobile ES/EN.

## Fuera de alcance
Guías/glosario (2b), categorías/necesidades (2c), eventos/qr/b (2d), panel (sub 3).
