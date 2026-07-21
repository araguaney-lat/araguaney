# Spec — i18n por URL (Fase 11, tarea 11) · Sub-proyecto 1: Infraestructura + slice vertical

**Fecha:** 2026-07-21
**Estado:** aprobado (diseño) · implementado (slice: home + centro-de-acopio)
**Alcance de ESTE spec:** solo el Sub-proyecto 1. Los subs 2–4 tienen sus propios specs.

> **Nota de implementación:** el slice entregado migra **home + `/centro-de-acopio`**
> (bilingüe, slug traducido `collection-center`), que ya prueba toda la estructura
> (prefijo + slug traducido + hreflang + contenido por locale + convivencia). La
> consolidación de `ayuda-humanitaria`/`humanitarian-aid` se movió al **Sub-proyecto 2**
> para mantener este PR enfocado.

---

## 1. Objetivo

Pasar de **locale por cookie** a **locale por URL** para habilitar `hreflang` real (Fase 11, tarea 11),
dejando una **estructura escalable a N idiomas**. Este sub-proyecto entrega la infraestructura y la
prueba de punta a punta en 3 páginas (home + `/centro-de-acopio` + `/ayuda-humanitaria`).

### Decisiones ya tomadas (brainstorming)
1. **Alcance final:** locale por URL en todo (público + panel). *Este sub-proyecto solo hace la infra + slice público; el panel es el sub 3.*
2. **Idioma default (es) sin prefijo**, resto prefijado: `/centro-de-acopio` (es) ↔ `/en/collection-center` (en). Preserva las URLs indexadas; futuros idiomas prefijados (`/pt/…`).
3. **Paridad total ES/EN** del contenido (traducir todo). *Este sub: solo las 3 páginas del slice.*
4. **Slugs traducidos por idioma**, vía un mapa central.

---

## 2. Mecanismo de routing

### Problema de convivencia
Un segmento `[lang]` en la raíz (`app/[lang]/…`) captura **cualquier** primer segmento
(`/necesidades` → `lang="necesidades"`), chocando con las rutas aún NO migradas. La migración es
gradual (subs 2–4), así que necesitamos convivencia.

### Solución: `app/[lang]/` + precedencia de rutas estáticas + middleware
En Next, una **ruta explícita** (`app/necesidades/page.tsx`) tiene **precedencia sobre el segmento
dinámico** `app/[lang]/…`. Por eso las páginas NO migradas siguen sirviéndose de sus páginas planas y
**no chocan** con `[lang]`. No hace falta namespace interno.

- Las páginas migradas viven en `app/[lang]/<slug-canónico>/page.tsx`. **Slug canónico = slug ES.**
- `generateStaticParams` → `["es","en"]`, `dynamicParams = false` → Next genera HTML por idioma
  (`/es/…`, `/en/…`) y cualquier `lang` inválido (p.ej. `/foobar` sin ruta explícita) → 404 natural.
- El **middleware** reescribe las URLs públicas hacia el árbol `[lang]` canónico:
  - `/` → rewrite `/es` · `/centro-de-acopio` → `/es/centro-de-acopio`
  - `/en` → `/en` (ya prefijado) · `/en/collection-center` → (mapa: slug EN → clave) → `/en/centro-de-acopio`
  - Inyecta `x-locale: <locale>` en el rewrite (para el `<html lang>` del root layout; §8).
  - Solo reescribe rutas cuya **clave está migrada** (allowlist del mapa). Las no migradas pasan de largo (`next()`) a su página plana.
  - **Canonicalización:** una forma no-canónica bajo prefijo (`/en/centro-de-acopio`, slug ES bajo `/en`) → `redirect` 308 a la canónica (`/en/collection-center`). Evita duplicados.
- **Convivencia:** el root `app/layout.tsx` sigue envolviendo todo; `app/[lang]/layout.tsx` es un layout
  anidado solo para las migradas (no emite `<html>`, §8).

### Por qué no el enfoque "header-based"
Reescribir todo a una sola página física pasando el locale por header rompe el estático (Next cachea
por path, no por header) → obligaría a páginas dinámicas = peor SEO/perf. Descartado.

---

## 3. Componentes (unidades con un propósito)

### 3.1 `src/lib/routes.ts` — mapa central (fuente de verdad)
```ts
export type Locale = "es" | "en"
export const LOCALES: Locale[] = ["es", "en"]
export const DEFAULT_LOCALE: Locale = "es"

// clave estable (= slug ES) → slug por idioma. Agregar idioma = agregar entrada.
export const ROUTE_SLUGS: Record<string, Record<Locale, string>> = {
  "": { es: "", en: "" },                                   // home
  "centro-de-acopio": { es: "centro-de-acopio", en: "collection-center" },
  "ayuda-humanitaria": { es: "ayuda-humanitaria", en: "humanitarian-aid" },
}
// helpers:
localizedPath(key, locale): string          // "/centro-de-acopio" | "/en/collection-center"
resolveSlug(locale, slug): string | null    // slug localizado → clave canónica (null si no existe)
isMigrated(key): boolean                     // allowlist para el middleware
```
- `localizedPath`: es → `/${esSlug}` (sin prefijo, `""`→`/`); otro → `/${locale}/${slug}`.
- Contrato: **la clave es el slug ES**. Cada nueva página se agrega aquí.

### 3.2 `src/middleware.ts` — extiende el auth actual
- Corre en las rutas públicas migradas (nuevo matcher que incluye `/`, los slugs migrados y `/en/:path*`), **además** de la lógica de auth existente (`/dashboard`, `/studio`, `/login`).
- Lógica i18n:
  1. Detecta locale: primer segmento `en` → en; si no, es.
  2. Quita el prefijo de idioma, resuelve el slug → clave (`resolveSlug`). Si no migrada/no existe → `next()` (pasa a la página plana o 404 natural).
  3. `rewrite` a `/<locale>/<clave>`, **inyectando el header `x-locale: <locale>`** (para que el root layout ponga `<html lang>`; ver §8).
  4. Forma no-canónica bajo prefijo (`/en/<slug-ES>`) → `redirect` 308 a la canónica (`/en/<slug-EN>`).
- No toca los redirects de auth ya existentes.

### 3.3 `app/[lang]/layout.tsx`
- `generateStaticParams` → `[{lang:"es"},{lang:"en"}]`; `dynamicParams = false`.
- Valida `lang` ∈ LOCALES → si no, `notFound()`.
- Provee el locale a las páginas hijas vía `params.lang` (no cookie).
- **NO emite `<html>`** (lo emite el root `app/layout.tsx`; ver §8). Solo pasa `children`.

### 3.4 `app/[lang]/**` — las 3 páginas del slice
- `page.tsx` (home), `centro-de-acopio/page.tsx`, `ayuda-humanitaria/page.tsx`.
- Cada una: `async function Page({ params }) { const { lang } = await params; const dict = await getDictionary(lang); … }`.
- Contenido bilingüe: UI desde `dict`; la prosa que hoy es ES-only se traduce (ver §4).
- `generateMetadata` usa el helper `alternates(key, lang)` (§3.5).

### 3.5 `src/lib/seo.ts` — helper `alternates`
```ts
alternates(key, locale) => {
  canonical: absoluteUrl(localizedPath(key, locale)),
  languages: { es: absoluteUrl(localizedPath(key,"es")),
               en: absoluteUrl(localizedPath(key,"en")),
               "x-default": absoluteUrl(localizedPath(key, DEFAULT_LOCALE)) }
}
```
Se usa en `metadata.alternates`. `ogImageUrl` se mantiene.

### 3.6 `LanguageSwitcher`
- En páginas migradas: navega a `localizedPath(currentKey, otherLocale)` (client component recibe `currentKey` como prop desde la página server).
- En páginas NO migradas: mantiene el comportamiento actual (cookie) hasta que se migren.

### 3.7 `getLocale()` (compatibilidad)
- Se **mantiene** el `getLocale()` por cookie para las áreas no migradas (panel, públicas sin migrar). Las páginas migradas **no** lo usan: reciben `lang` por `params`. Convivencia sin romper nada.

---

## 4. Contenido del slice (traducción EN)
- **home:** ya es bilingüe por `dict` (hero, steps, why, standards, footer). Verificar paridad; sin prosa ES-only.
- **`/centro-de-acopio`:** hoy ES-only. Traducir su copy a EN (título, diferenciadores, FAQ, CTA). El par EN se sirve en `/en/collection-center`.
- **`/ayuda-humanitaria`:** ya existe su gemela `/humanitarian-aid` (contenido EN hecho a mano). **Consolidar**: el contenido EN se mueve a la página `[lang]`, se borra la página plana duplicada `app/humanitarian-aid`, y `humanitarian-aid` queda como slug EN en el mapa.

---

## 5. Convivencia / qué NO se toca
- Todas las demás públicas (guías, glosario, categorías, necesidades, contacto, legales, eventos, qr/b) y el panel/studio **siguen igual** (páginas planas, cookie). No entran al middleware i18n (no están en el allowlist).
- Los slugs `humanitarian-aid` viejo se borra (consolidado). `privacy/terms` duales se dejan para el sub 2.

---

## 6. Testing / verificación
- **Routing:** `/` y `/centro-de-acopio` → 200 ES; `/en` y `/en/collection-center` → 200 EN; `/en/centro-de-acopio` (slug ES bajo prefijo EN) → 308 → `/en/collection-center`; `/necesidades` (no migrada) → 200 sin cambios.
- **hreflang:** cada una de las 3 emite `canonical` correcto + `link rel=alternate hreflang=es|en|x-default`.
- **`<html lang>`:** es en ES, en en EN.
- **Switcher:** desde `/centro-de-acopio` cambia a `/en/collection-center` y viceversa.
- **Build estático** verde con HTML por locale. `tsc` verde.
- **Mobile 390px** ES y EN (screenshots).
- **Sitemap:** agregar las alternas EN de las 3 migradas (o dejar para sub 2 — decisión: agregar las 3 EN ahora para no romper hreflang↔sitemap).

## 7. Definition of Done (sub-proyecto 1)
- Infra (`routes.ts`, middleware, `app/[lang]`, `alternates`) implementada y probada.
- 3 páginas migradas con contenido EN + hreflang, estáticas por locale.
- Duplicado `humanitarian-aid` consolidado y borrado.
- Resto del sitio intacto (convivencia verificada).
- Sin PII nueva; build + tsc verdes.

## 8. Riesgos
- **Middleware + rewrites + SSG**: interacción delicada; mitigar con pruebas de routing explícitas.
- **Matcher del middleware**: debe cubrir las rutas migradas sin capturar las no migradas ni assets (`/_next`, imágenes). Excluir estáticos en el matcher.
- **Doble `<html>`**: el `app/layout.tsx` raíz ya emite `<html>`. Las páginas bajo `app/[lang]` heredan ese root layout → NO deben emitir otro `<html>`. El `lang` dinámico se setea en el root layout leyendo el locale del rewrite (header que inyecta el middleware) — ajustar el root layout para leer `x-locale` si viene, si no, cookie.
