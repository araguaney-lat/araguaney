# Spec — Hub /preguntas-frecuentes — Fase 17 task 13

**Fecha:** 2026-07-24
**Fase roadmap:** 17 — AEO/GEO, task 13 (Cluster H — preguntas directas, AEO/PAA/voz).

## Objetivo

Un hub de preguntas frecuentes con formato pregunta-respuesta directo y `FAQPage` schema —
el formato que los motores de respuesta de IA y las cajas "People Also Ask" citan.

## Decisiones (confirmadas con el usuario)

1. **Set curado, no agregación literal.** ~16 Q&A canónicas del dominio (no copiar las ~32
   dispersas). Algo de solape con las FAQ de cada página es normal en un hub.
2. **4 grupos temáticos:** Producto/plataforma · Donaciones y reglas · Operación · Privacidad y datos.
3. **Idiomas:** ES + EN.

## Ruta

- Nueva `RouteKey`: `preguntas-frecuentes` → es `preguntas-frecuentes`, en `faq`.
- Añadir ambos slugs al `config.matcher` de `middleware.ts` (slug ES sin prefijo).
- Página `app/[lang]/preguntas-frecuentes/page.tsx` (patrón pilar).

## Estructura

`CONTENT: Record<Locale, Content>` con `groups: { title, faqs: {q,a}[] }[]`. Render: un
`<FaqSection items={group.faqs} title={group.title} />` por grupo (cada uno con su `<h2>`),
más `HomeNav`/`HomeFooter`/`Breadcrumbs`/hero. Respuestas en **texto plano** (FaqSection las
renderiza así; el `FAQPage` schema también las requiere planas).

Grupos y preguntas (≈16):
1. **Producto / plataforma** — qué es Araguaney, cuánto cuesta, instalar/servidores, cualquier
   emergencia, vs hoja de cálculo.
2. **Donaciones y reglas** — qué es un centro de acopio, qué se puede donar, caja homogénea,
   reglas de medicamentos (OMS), qué se rechaza.
3. **Operación** — flujo acopio→envío, qué es un manifiesto, cómo sumo mi centro, coordinar
   varios centros.
4. **Privacidad y datos** — datos personales, dinero/beneficiarios.

## Structured data

- **Un** `FAQPage` que agrega **todas** las preguntas de los 4 grupos (flatten) — vía `faqSchema`.
- `BreadcrumbList`.

## Plomería / internal linking

- `sitemap.ts`: `priority 0.6`, `changeFrequency monthly`, hreflang.
- `llms.txt` + `llms-full.txt`: enlace al hub.
- **Footer** (`HomeFooter`): enlace "Preguntas frecuentes" / "FAQ" junto a "Nosotros".
- Sección de cross-links al final → `/centro-de-acopio`, `/guias`, `/alternativa-a-excel-para-donaciones`, `/nosotros`.

## No-objetivos

- No copiar literalmente las FAQ de cada página.
- No enlaces dentro de las respuestas (van en la sección de cross-links; el schema quiere texto plano).
- Sin backend, sin componentes nuevos.

## Definition of Done

- `/preguntas-frecuentes` (ES) y `/faq` (EN) renderizan los 4 grupos.
- Un `FAQPage` con todas las preguntas + `BreadcrumbList`; canonical/hreflang correctos.
- `routes.ts` + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + footer link.
- `tsc` y build verdes; verificado corriendo la app (ES/EN 200, FAQPage presente, footer link).
- Roadmap Fase 17 task 13 → Done; README actualizado.
