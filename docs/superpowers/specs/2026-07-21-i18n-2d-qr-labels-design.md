# Spec — i18n Sub-proyecto 2d: fichas QR bilingües + eventos ES-only

**Fecha:** 2026-07-21 · **Estado:** aprobado
**Depende de:** Sub-1 (infra) — pero 2d NO usa URL-locale (estas páginas quedan fuera del sistema).

## Contexto / decisión
`eventos/[slug]`, `qr/[code]` y `b/[code]` muestran **datos capturados por el admin en español** (nombre de campaña, nombre de producto). No hay contenido traducible → **NO** entran al sistema URL-locale (agregar hreflang a contenido no traducido daña el SEO). Con esto, la i18n-por-URL de páginas públicas queda **completa** (subs 1–2c).

El único valor de 2d es **operativo**: un voluntario internacional que escanea un QR en campo debe poder leer los **labels** de la ficha en inglés.

## Alcance
1. **`eventos/[slug]`**: se deja ES-only. Documentar con un comentario que es intencional (datos de campaña ES, sin URL-locale). Sin cambios funcionales.
2. **`qr/[code]`** (server component): labels bilingües por **Accept-Language** del navegador (`headers()` → `en`|`es`). Traducir todos los labels (categorías, estados, campos, secciones, "Historial", footer, "Ficha no encontrada"). La **data** (producto, lote, centro, campaña) queda como viene del backend (ES). Fechas: `es-MX`|`en-US` según locale.
3. **`b/[code]`** (client component): idem por `navigator.language` en cliente.

## No cambia
- URLs (siguen `/qr/{code}`, `/b/{code}`, `/eventos/{slug}`), sin `/en`, sin hreflang.
- La data del backend, el gate Turnstile de `b/[code]`, la lógica de fetch.

## Testing
- `qr/[code]` con `Accept-Language: en` → labels en inglés; `es`/default → español. Build + tsc.
- Verificar que la data (nombres) sigue intacta.

## Fuera de alcance
Sub 3 (panel/studio), sub 4 (manuales). El `inLanguage:"es"` de los schema helpers (micro-fix aparte).
