# Spec — i18n Sub-proyecto 4: manuales EN

**Fecha:** 2026-07-21 · **Estado:** aprobado
**Depende de:** Sub-3 (URL-locale panel: `/en/dashboard/*` + `getLocale()` por header/cookie).

## Contexto / decisión

Los 15 manuales de ayuda (`/dashboard/ayuda`, `/dashboard/ayuda/[slug]`) existen solo en
español: cuerpo HTML en `content/manuals/<slug>.html`, metadatos (título/blurb/grupo) en
`app/dashboard/ayuda/manuals.ts`, estilados por `.manual` (`manual.css`). Con el panel ya en
URL-locale (sub-3), un usuario EN (`/en/dashboard/ayuda/...` o cookie=en) tiene
`getLocale()="en"` pero ve contenido ES. Sub-4 provee la versión inglesa.

**Slugs:** se mantienen en español (`recepcion`, `cajas`, …), consistente con la decisión de
sub-3 (panel = mismo slug + prefijo). `/en/dashboard/ayuda/recepcion` sirve el manual "Intake"
en inglés. Sin traducir slugs → sin tocar rutas ni `generateStaticParams`.

## Alcance

1. **Contenido EN:** 15 archivos nuevos en `content/manuals/en/<slug>.html`. El ES queda flat
   en `content/manuals/<slug>.html` (no se mueve → diff mínimo). Cada EN es traducción 1:1 del
   ES **preservando**: estructura DOM, clases (`doc`, `wrap`, `eyebrow`, `card`, `steps`, `n`,
   `perm`, `foot`, `grid two`, …), rutas `/dashboard/*` de los `crumbs`, y los nombres de rol
   en `<code>` (`volunteer`, `coordinator`, `national_admin` — no se traducen, son valores del
   sistema). Solo se traduce el texto visible.

2. **`manuals.ts`:** `title`, `blurb` y el nombre de `group` pasan a `Record<Locale,string>`.
   Se agrega `readManualHtml(slug, locale)` (lee `en/<slug>.html` si `locale==="en"`, si no el
   flat) y un helper `localizedGroups(locale)` / `pickManual(meta, locale)` para el índice.
   `getManual`, `ALL_SLUGS`, `generateStaticParams` no cambian (los slugs son los mismos).

3. **`app/dashboard/ayuda/page.tsx` (índice):** `getLocale()` → grupos/tarjetas localizados +
   strings del header (eyebrow "Ayuda/Help", h1, lede).

4. **`app/dashboard/ayuda/[slug]/page.tsx`:** `getLocale()` → `readManualHtml(slug, locale)` +
   back-link "Ayuda"/"Help". Pasa a dinámica (usa `headers()` vía `getLocale()`), aceptable en
   un panel auth-gated (no se prerenderiza).

## No cambia

- `manual.css` (scoped a `.manual`, agnóstico de idioma).
- Slugs / rutas / `generateStaticParams`.
- El resto del panel.

## Testing (build local + prod server)

- `/en/dashboard/ayuda` → índice en inglés (grupos + tarjetas EN).
- `/en/dashboard/ayuda/recepcion` → cuerpo en inglés; `/dashboard/ayuda/recepcion` (sin
  prefijo / cookie es) → español.
- Verificar que clases, rutas `/dashboard/*` y códigos de rol quedan intactos en el EN
  (spot-check de 2-3 archivos).
- `tsc` + `next build` verdes.

## Fuera de alcance

Traducir slugs de manuales. Cambios de diseño/CSS. Otros idiomas (la estructura ya soporta
agregar más locales al registry).
