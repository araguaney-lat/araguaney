# Spec — Changelog /novedades — Fase 17 task 16

**Fecha:** 2026-07-24
**Fase roadmap:** 17 — AEO/GEO, task 16.

## Objetivo

Un changelog público que da una **señal de frescura recurrente** (páginas fechadas y
actualizadas) y captura keywords de features. Complementa la cadencia de frescura de la task 15.

## Decisiones (confirmadas con el usuario)

1. **Slug** `/novedades` (es) / `/whats-new` (en).
2. **Data file curado** `src/lib/changelog.ts` (fuente única, se apenda al lanzar features).
3. **Idiomas:** ES + EN.

## Ruta

- Nueva `RouteKey`: `novedades` → es `novedades`, en `whats-new`.
- Matcher (`middleware.ts`): `/novedades` + `/whats-new`.
- Página `app/[lang]/novedades/page.tsx` (patrón pilar).

## Data file

`src/lib/changelog.ts`:
```ts
export interface ChangelogEntry {
  date: string          // ISO yyyy-mm-dd
  tag: "new" | "improvement" | "fix"
  es: { title: string; body: string }
  en: { title: string; body: string }
}
export const CHANGELOG: readonly ChangelogEntry[]  // orden desc (más nueva primero)
export function tagLabel(tag, locale): string
```
Seed con ~7 notas reales user-facing de features ya lanzadas: panel nacional agregado,
manifiesto + etiquetas QR, transferencias entre centros, mensajería, reportes de campaña,
auto-registro de centros, panel de deliverability de emails.

## Estructura

1. **Hero** — eyebrow "Novedades", H1, lead + fecha de la última entrada (señal de frescura).
2. **Lista cronológica** — por entrada: fecha (reusando `formatContentDate` de `content-dates.ts`),
   tag (chip), título, descripción. Newest first.

## Structured data

- `BreadcrumbList`.
- La fecha visible de la última entrada da la frescura (no se requiere schema extra).

## Plomería / internal linking

- `sitemap.ts`: entrada (priority 0.5, monthly, hreflang).
- `llms.txt` + `llms-full.txt`: enlace.
- **Footer** (`HomeFooter`): enlace "Novedades" / "What's new" junto a "Preguntas frecuentes".

## No-objetivos

- No derivar del git automáticamente (data file curado, notas user-facing).
- Sin backend, sin componentes nuevos (reusar `formatContentDate`).

## Nota de mantenimiento

El valor sostenido depende de **apendar una entrada al lanzar cada feature** — misma disciplina
que la cadencia de frescura (task 15).

## Definition of Done

- `/novedades` (ES) y `/whats-new` (EN) renderizan la lista fechada.
- `routes.ts` + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + footer link.
- `BreadcrumbList`; canonical/hreflang correctos.
- `tsc` y build verdes; verificado corriendo la app (ES/EN 200, entradas fechadas, footer link).
- Roadmap Fase 17 task 16 → Done; README actualizado.
