# Spec — i18n Sub-proyecto 3: URL-locale para panel/studio

**Fecha:** 2026-07-21 · **Estado:** aprobado
**Depende de:** Sub-1 (infra i18n, `routes.ts`, middleware `handleI18n`, `getLocale`).

## Contexto / decisión

El panel (`/dashboard/*`) y el studio (`/studio/*`) ya son bilingües **por cookie**
(`getLocale()` = header `x-locale` → cookie `locale`). Sub-3 lleva el locale a la **URL**
(`/en/dashboard/...`) por simetría con lo público y para permitir **enlaces EN compartibles**.

**Cero SEO:** el panel es auth-gated + `robots` disallow → **no** lleva hreflang/alternates.

**Estrategia de slug (aprobada):** **prefijo, mismo slug** — `/en/dashboard/boxes`, `/en/studio`.
No se traducen slugs (los labels de la UI ya son bilingües vía diccionarios). Esto evita
mapear 29 rutas y reescribir Links internos.

## Mecánica

### Prefijo = entrada + sincronía de cookie (clave)
Visitar una URL con prefijo `/en/dashboard/*` o `/en/studio/*`:
1. **rewrite** interno a la ruta sin prefijo (`/dashboard/*`) — **no se mueven** los 29 archivos.
2. Setea header `x-locale=en` para el render actual (`<html lang>` + diccionario).
3. Setea **cookie `locale=en`** en la respuesta.

Gracias a (3), los Links internos sin prefijo (`/dashboard/pallets`, etc.) **siguen en EN**
por cookie. No hay que reescribir ningún Link ni el nav-config. El prefijo `/en` funciona
como **punto de entrada compartible** que sincroniza la preferencia.

### ES = sin prefijo (igual que hoy)
`/dashboard/*`, `/studio/*` sin prefijo → comportamiento actual (locale por cookie, default `es`).
No se fuerza `x-locale`, no hay redirect (evita loops).

### Auth + prefijo
El wrapper NextAuth (`runAuth`) hoy asume `pathname` = ruta física. Se reestructura para:
1. Detectar y **despojar** el prefijo `/en` cuando precede a `/dashboard`|`/studio` → `logical`.
2. Correr las comprobaciones (`isDashboard`, `isStudio`, `isAdminOnly`) sobre `logical`.
3. Preservar el prefijo en los redirects internos (studio→dashboard, admin→dashboard).
4. `callbackUrl` del gate de login preserva el `pathname` con prefijo → post-login vuelve a EN.
5. Landing post-login (`isAuthPage && isLoggedIn`) respeta la **cookie** (`/en/dashboard` si cookie=en).
6. En éxito de una ruta con prefijo: `NextResponse.rewrite(logical)` + `x-locale=en` + cookie=en.
   Sin prefijo: `NextResponse.next()` (sin cambios).

Se replica el patrón probado de `handleI18n` público: `res.headers.set("x-locale", …)`.

### Switcher del panel
`LanguageSwitcher` (usado solo en `Sidebar`, `StudioSidebar`, `BottomNav` — todos panel) pasa
de solo-cookie a **navegar**: al cambiar, alterna el prefijo `/en` sobre el `pathname` actual
(`usePathname` + `useRouter`) y además llama `setLocale` (cookie, para persistir la variante ES
sin prefijo). Así la URL refleja el locale (compartible) y la cookie mantiene la sesión.

## Archivos que cambian
1. `src/middleware.ts` — reestructurar `runAuth` para el prefijo de locale del panel.
2. `src/components/LanguageSwitcher.tsx` — navegar (toggle de prefijo) al cambiar de idioma.

## No cambia
- Los 29 `page.tsx` del panel (no se mueven a `app/[lang]`).
- Los ~11 archivos con Links internos ni `nav-config.ts` (cookie-sync lo cubre).
- `routes.ts` / `ROUTE_SLUGS` (el panel no entra al mapa de slugs).
- `seo.ts` / alternates (sin hreflang para rutas auth-gated).
- `handleI18n` público (queda intacto; `/en/dashboard/*` cae a `null` y pasa a auth).

## Testing (build local + prod server)
- `GET /en/dashboard` sin sesión → redirect a `/login?callbackUrl=%2Fen%2Fdashboard`.
- Con sesión: `/en/dashboard` → 200, `<html lang="en">`, nav en inglés, `Set-Cookie locale=en`.
- Tras cookie=en, `GET /dashboard` (sin prefijo) → sigue EN.
- `/dashboard` fresco (cookie es/ausente) → ES.
- `/en/studio` con superadmin → 200 EN; sin superadmin → redirect a `/en/dashboard`.
- Switcher: en `/dashboard/boxes` clic EN → navega a `/en/dashboard/boxes`; clic ES → `/dashboard/boxes`.
- `tsc` + `next build` verdes.

## Fuera de alcance
Sub 4 (manuales EN). Micro-fix `inLanguage:"es"` de los schema helpers.
