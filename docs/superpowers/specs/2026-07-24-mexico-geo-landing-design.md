# Spec — Landing geográfica de México — Fase 17 task 12

**Fecha:** 2026-07-24
**Fase roadmap:** 17 — AEO/GEO, task 12 (Cluster G — geográfico MX + LATAM).

## Objetivo

Una landing **sustanciosa de México** que capture "centro de acopio México", "donación de
medicamentos COFEPRIS" y "aduana México ayuda humanitaria (SAT)", con contenido local real
(no plantilla). Reforzar el `areaServed` del Organization schema para señalar alcance LATAM
sin crear páginas-stub por país.

## Decisiones (confirmadas con el usuario)

1. **Una sola página fuerte de México**, NO stubs por ciudad/país (evita thin/doorway pages).
   Las ciudades (CDMX, Monterrey, Guadalajara) se mencionan dentro del texto, sin páginas
   dedicadas.
2. **Estrategia de evolución** (documentada, no código): países siguientes uno a uno, gated por
   contenido regulatorio local real + demanda medida; refactor a ruta `/[pais]` data-driven solo
   al llegar a ~4-5 países con sustancia. El core (pilares) sigue agnóstico.
3. **Idiomas:** ES + EN.

## Ruta

- Nueva `RouteKey`: `centro-de-acopio-mexico` → es `centro-de-acopio-mexico`, en `collection-center-mexico`.
- Matcher (`middleware.ts`): `/centro-de-acopio-mexico` + `/collection-center-mexico`.
- Página `app/[lang]/centro-de-acopio-mexico/page.tsx` (patrón pilar).

## Estructura

1. **Hero** — "Centro de acopio en México" + lead con contexto (menciona CDMX, Monterrey,
   Guadalajara).
2. **COFEPRIS** — cómo se identifican los medicamentos en México y cómo Araguaney apoya ese
   registro (INN, lote, caducidad, reglas OMS). Sin inventar procedimientos; framing "cómo
   Araguaney ayuda a cumplir".
3. **Aduana / SAT** — el régimen de importación humanitaria en México, en términos generales y
   correctos; enlaza a la guía existente `/guias/como-preparar-carga-humanitaria-para-aduana`.
   Con nota: "no es asesoría legal; consulta la normativa vigente".
4. **Cómo ayuda Araguaney** — el estándar en breve.
5. **CTA + cross-links** → `/centro-de-acopio`, guía de aduana, `/necesidades`.

## Structured data + entidad

- `BreadcrumbList`.
- **Reforzar `areaServed`** en `ORGANIZATION_SCHEMA`: de `{ Place: "América Latina" }` a una lista
  de `Place` (México + países LATAM: Colombia, Chile, Perú, Venezuela, Argentina, …) — señal de
  alcance geográfico sin páginas por país.

## Plomería / internal linking

- `sitemap.ts`: entrada (priority 0.7, monthly, hreflang).
- `llms.txt` + `llms-full.txt`: enlace.
- Cross-link recíproco: la guía de aduana y/o `/centro-de-acopio` enlazan a la página de México.

## No-objetivos

- NO crear páginas por ciudad ni stubs por país (thin pages).
- NO dar asesoría legal ni citar artículos/procedimientos específicos que no se puedan verificar.
- Sin backend, sin componentes nuevos.

## Definition of Done

- `/centro-de-acopio-mexico` (ES) y `/collection-center-mexico` (EN) renderizan las secciones.
- `areaServed` reforzado con lista de países.
- `routes.ts` + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + cross-link.
- `BreadcrumbList`; canonical/hreflang correctos.
- `tsc` y build verdes; verificado corriendo la app (ES/EN 200, areaServed con países).
- Roadmap Fase 17 task 12 → Done; README actualizado.
