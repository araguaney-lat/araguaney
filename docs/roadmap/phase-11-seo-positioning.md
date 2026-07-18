# Fase 11 — SEO y reposicionamiento genérico

> Estrategia de posicionamiento orgánico para impulsar el uso de Araguaney.
> Objetivo clave: **reposicionar la herramienta de "ayuda a Venezuela" a plataforma
> genérica de logística humanitaria**, útil para casi cualquier escenario de ayuda
> (sismos, inundaciones, crisis migratorias, incendios, etc.), sin perder la capacidad
> de capturar tráfico de eventos específicos en curso.

> Basado en investigación de mercado (julio 2026). Ver sección "Hallazgos" abajo.

---

## Hallazgos de la investigación

### Hallazgo 1 — Hueco de mercado en español

La búsqueda `"centro de acopio" software registro donaciones` **no devuelve ningún player de
software** — solo notas de prensa y listados de ubicaciones. El término tiene volumen alto y
**cero competencia SEO de producto**. Es el keyword ancla.

### Hallazgo 2 — Competidores solo en inglés

HELM (Humanitarian Software), Sahana, Wasp, GearChain, DonationX: todos en inglés, orientados a
food banks / NGOs establecidas en EE.UU. Ninguno posiciona en español ni ataca "centro de acopio".
Araguaney puede dominar el nicho hispano con baja competencia.

### Hallazgo 3 — Arquitectura de dos capas

- **Capa evergreen (core)**: keywords agnósticas de desastre → SEO permanente.
- **Capa de captura por evento**: landing pages efímeras por emergencia (Venezuela hoy, el próximo
  sismo mañana) que redirigen tráfico al core.

No quemar el dominio en "ayuda Venezuela". Venezuela = entrada de tráfico, no identidad.

---

## Clusters de keywords

### Cluster A — Head terms (evergreen, alta intención)

| Keyword (ES) | Keyword (EN) | Intención |
|---|---|---|
| software centro de acopio | donation center software | producto ★ |
| gestión de donaciones en especie | in-kind donation management | producto ★ |
| inventario de ayuda humanitaria | humanitarian aid inventory | producto |
| software para donaciones de emergencia | disaster relief donation software | producto |
| trazabilidad de donaciones | donation traceability / tracking | diferenciador |

### Cluster B — Body / diferenciadores (baja competencia, alta conversión)

- manifiesto de donaciones / packing list humanitario
- etiqueta QR para cajas de donación
- caja homogénea donaciones / clasificación de donaciones
- panel nacional de acopio / stock de donaciones en tiempo real
- donación de medicamentos OMS caducidad
- coordinación de centros de acopio

### Cluster C — Long-tail (informacional, top-of-funnel)

- cómo organizar un centro de acopio
- qué se puede donar en un centro de acopio
- software gratis para gestionar donaciones ONG
- sistema de inventario para damnificados
- cómo preparar carga humanitaria para aduana
- registro de voluntarios centro de acopio

### Cluster D — Captura por evento (efímera, alto volumen)

- centros de acopio [ciudad] [desastre]
- qué falta en centros de acopio [evento] → mapea directo al panel público "qué falta"
- dónde donar [desastre] 2026

> La ruta pública `/necesidades` + fichas QR ya cacheadas en edge son imanes SEO naturales para el
> Cluster D. Cada centro que se une genera páginas indexables.

---

## Tareas

### Grupo A — Reposicionamiento y páginas core

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 1 | Reposicionar Home a mensaje genérico | Cambiar H1/hero de enfoque Venezuela a genérico: "El estándar común para centros de acopio y ayuda humanitaria". Venezuela pasa a caso de uso / prueba social, no título. Ajustar `hero.*` en `es.json`/`en.json`. | 🟠 | ✅ Done — el hero/steps/standards ya eran genéricos (sin mención a Venezuela). El único texto no genérico era `why.subtitle` ("...envían suministros a Venezuela..."), reescrito para mencionar sismos/inundaciones/emergencias en general en vez de un país específico. |
| 2 | Página pilar `/centro-de-acopio` | Landing evergreen que captura el head term huérfano. Guía + explicación del producto + CTA a la app. Contenido optimizado para "software centro de acopio" y "gestión de donaciones en especie". | 🟠 | ✅ Done |
| 3 | Página pilar `/ayuda-humanitaria` (EN: `/humanitarian-aid`) | Landing genérica agnóstica de desastre. Explica los escenarios soportados (sismos, inundaciones, migración, incendios). Refuerza que la herramienta sirve para cualquier emergencia. | 🟠 | ✅ Done — 2 URLs separadas (ES/EN) con contenido fijo por idioma; el selector de idioma navega entre ambas en vez de solo cambiar la cookie de locale. |
| 4 | Optimizar `/necesidades` como SEO asset | Meta title/description dinámicos por campaña y categoría. Contenido indexable (SSR/ISR, no solo cliente). Mantener edge-cache. Mapea al Cluster D ("qué falta"). | 🟠 | ✅ Done — `/necesidades` (agregado nacional) ya tenía metadata/canonical/SSR desde Grupo B. Lo dinámico "por campaña" se resolvió con `/eventos/{slug}` (tarea 18, Grupo C): nuevo endpoint público `GET /v1/public/campaigns/{slug}` + campo `slug` en `Campaign` (migración 017) sirven el "qué falta" filtrado por campaña con su propio title/description. |
| 5 | Sección "Estándares que respaldamos" | Ya planeada en Fase 6 (task 12) — coordinar: logos + texto WHO/IFRC/IOM/UNSPSC/GS1. Refuerza E-E-A-T y captura keywords de estándares. | 🟡 | ✅ Done — ya implementada en Fase 6 (task 31), sección visible en home con los 5 estándares. Sin trabajo adicional necesario. |

### Grupo B — SEO técnico

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 6 | Metadata dinámica (App Router) | Implementar `generateMetadata()` en páginas públicas: title, description, keywords por ruta. Sin duplicados. | 🟠 | ✅ Done |
| 7 | Open Graph + Twitter Cards | Tags OG/Twitter en todas las páginas públicas (imagen, título, descripción) para compartir en redes. Imagen OG por defecto + dinámica en `/necesidades`. | 🟡 | ✅ Done — `app/necesidades/opengraph-image.tsx` genera la imagen con `next/og` (`ImageResponse`), mostrando las top 4 categorías con más unidades en tiempo real (misma data que la página, `revalidate=300`). Auto-referenciada por Next.js en el `<head>`, sin cambios adicionales en `generateMetadata`. |
| 8 | `sitemap.xml` dinámico | `app/sitemap.ts` que incluya rutas estáticas + `/necesidades` + campañas públicas + fichas QR indexables. Regenerar en ISR. | 🟠 | ✅ Done — `sitemap.ts` ahora es async y consume `GET /v1/public/campaigns` (nuevo endpoint) para listar cada `/eventos/{slug}` dinámicamente. Fichas QR quedan fuera a propósito (no diseñadas para enumerarse — `public/qr/{code}` es lookup-by-code, no un listado). |
| 9 | `robots.txt` | `app/robots.ts` — permitir rutas públicas, bloquear `/dashboard`, `/studio`, `/api`. Referenciar sitemap. | 🟠 | ✅ Done |
| 10 | Canonical URLs | Canonical tag en todas las páginas para evitar contenido duplicado (especialmente entre ES/EN y parámetros de campaña). | 🟡 | ✅ Done — `alternates.canonical` en home, necesidades, contacto y qr/[code]. |
| 11 | `hreflang` ES/EN | Tags `hreflang` para señalar versiones de idioma a buscadores. | 🟢 | ⬜ Bloqueada — el sitio usa locale por cookie (mismo URL para ES/EN), no locale por URL. `hreflang` solo tiene valor SEO real con URLs distintas por idioma; agregarlo ahora sería cosmético y probablemente ignorado por Google. Requiere decisión de arquitectura (routing por subpath `/en/...`) fuera de alcance de esta tarea. |
| 12 | Schema.org structured data | JSON-LD: `SoftwareApplication` (home/pilar), `NGO`/`Organization`, `FAQPage` (guías). Mejora rich snippets. | 🟡 | ✅ Done — `SoftwareApplication` + `Organization` en home; `FAQPage` en la guía "Cómo organizar un centro de acopio" (Grupo C, tarea 15). |
| 13 | Core Web Vitals / performance | Auditar LCP/CLS/INP con Lighthouse. Optimizar imágenes (ya hay config en `next.config.ts`), lazy-load, reducir JS del cliente en páginas públicas. Ranking factor. | 🟡 | ✅ Done — auditoría Lighthouse completa contra build de producción local (9 páginas públicas). Resultado final: **Accessibility 100, Best Practices 100, SEO 100 en las 9**; Performance 88-94 (todas "good"). Hallazgos y fixes: (1) imagen hero sin `sizes` — 126KB desperdiciados en mobile, `sizes="(min-width: 768px) 400px, 240px"` agregado, ahora 62KB (-51%); (2) contraste insuficiente en `text-zinc-400` (`/necesidades`, `/eventos/[slug]`, `/qr/[code]`) → `text-zinc-500`; (3) `alt` redundante en 5 logos junto a texto visible (nav, footer, login, login/2fa, contacto) → `alt=""`; (4) dorado de marca `#E0A100`/`#B07D00` y grises `#9A9081`/`#8A8073` sin contraste AA en las etiquetas "eyebrow" de *todas* las páginas públicas → oscurecidos a `#906400`/`#946A00`/`#6E6557` (decisión confirmada con el usuario, mantiene la familia de color); (5) **bug real encontrado, no solo de scoring**: el CSP en `next.config.ts` bloqueaba `challenges.cloudflare.com` (Turnstile del formulario de contacto, completamente roto en producción) y `googletagmanager.com` (GA4 de la tarea 21, silenciosamente bloqueado) — invisible a verificación con `curl` porque CSP solo lo aplica un navegador real. Corregido agregando ambos dominios a `script-src`/`connect-src`/`frame-src`. |
| 14 | Accesibilidad / alt text | Alt text descriptivo en imágenes, jerarquía semántica de headings, contraste. SEO + a11y. | 🟢 | ✅ Done — auditado: alt text correcto (incl. `alt=""` en decorativas), un solo `<h1>` por página pública. Fix adicional: `<html lang>` ahora dinámico según locale (antes fijo en `es`, rompía a11y/SEO al cambiar idioma). |
| 14b | `llms.txt` (no listada originalmente) | `public/llms.txt` — resumen del producto y links a páginas públicas para crawlers de IA (ChatGPT, Claude, Perplexity), siguiendo la convención llmstxt.org. Agregada a petición explícita, complementa `robots.txt`. | 🟢 | ✅ Done |

### Grupo C — Contenido y captura por evento

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 15 | Guía "Cómo organizar un centro de acopio" | Artículo pilar long-tail (Cluster C). Top-of-funnel, enlaza a la app. Marca con `FAQPage` schema. | 🟡 | ✅ Done — `/guias/como-organizar-un-centro-de-acopio`, con 4 preguntas + `FAQPage` JSON-LD. |
| 16 | Guía "Qué se puede donar" | Artículo mapeado a `/necesidades` y a las categorías/estándares (WHO caducidad, controlados). | 🟢 | ✅ Done — `/guias/que-se-puede-donar`, enlazada desde `/necesidades`. |
| 17 | Guía "Cómo preparar carga humanitaria para aduana" | Long-tail que mapea al manifiesto/packing list exportable. Diferenciador vs competencia. | 🟢 | ✅ Done — `/guias/como-preparar-carga-humanitaria-para-aduana`. |
| 18 | Template de landing por evento | Componente/ruta reutilizable para landings efímeras `[evento]` (Cluster D). Título + "qué falta" + CTA. Reusable para cualquier emergencia futura. | 🟡 | ✅ Done — `/eventos/[slug]/page.tsx`. Requirió trabajo de backend: campo `slug` en `Campaign` (migración 017, autogenerado on-create vía `slugify()` con dedupe de colisiones) + `GET /v1/public/campaigns` (listado) y `GET /v1/public/campaigns/{slug}` (detalle + `needed_by_category` filtrado por campaña) en `dashboard.py`. Cubierto con tests (slugify, generación/dedupe de slug en `CampaignService`, filtrado por `campaign_id` en `AggregateRepository`). |
| 19 | Internal linking strategy | Enlaces internos entre home → pilares → guías → `/necesidades` → app. Distribuye autoridad y mejora crawl. | 🟢 | ✅ Done — home enlaza a las 3 guías (solo locale ES); `/necesidades` enlaza a "qué se puede donar"; `/centro-de-acopio` enlaza a "cómo organizar"; `/ayuda-humanitaria` y `/humanitarian-aid` enlazan a "qué se puede donar" + "cómo preparar carga"; cada guía enlaza de vuelta a pilares, `/necesidades` y `/login`. |

### Grupo D — Medición y herramientas

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 20 | Google Search Console | Verificar dominio, enviar sitemap, monitorear cobertura e impresiones/clics por keyword. | 🟠 | ✅ Done — propiedad URL-prefix `https://www.araguaney.lat` verificada (método HTML-file, `public/googlea08d3441ea25fc8b.html`), sitemap enviado. |
| 21 | Analytics de tráfico | GA4 o alternativa privacy-friendly (Plausible/Umami — alineado con "sin PII"). Medir conversión visita → registro. | 🟡 | ✅ Done (decisión del usuario: GA4 en vez de la opción privacy-first recomendada) — `src/components/GoogleAnalytics.tsx` carga `gtag.js` solo si `NEXT_PUBLIC_GA_MEASUREMENT_ID` está configurado, y **nunca** en `/dashboard` o `/studio` (evita mezclar uso interno autenticado con el funnel de marketing). `anonymize_ip: true` activado. Como las cuentas se crean por invitación de admin (CLAUDE.md §6, no hay registro público), se instrumentó un evento personalizado `cta_click` vía `src/components/CtaLink.tsx` en los CTAs principales de home, los 3 pilares y la guía de aduana — aproxima "intención de entrar" en vez de un signup real. Propiedad GA4 creada, `NEXT_PUBLIC_GA_MEASUREMENT_ID` configurado en Vercel — activo. |
| 22 | Seguimiento de posiciones (rank tracking) | Monitorear ranking de los head terms (Cluster A) y diferenciadores (Cluster B) en ES y EN. Revisar mensual. | 🟢 | ✅ Done (documentado, sin herramienta paga por decisión del usuario) — proceso mensual: Search Console → Rendimiento → filtrar por cada keyword de Cluster A/B (ES y EN) → registrar posición promedio, impresiones y clics en una hoja de cálculo con una fila por mes. Requiere la tarea 20 completa primero (necesita datos de Search Console). |

### Grupo E — Endurecimiento de visibilidad (rich results + IA)

> Segunda pasada sobre SEO técnico/contenido, aditiva sobre Grupos B y C ya cerrados.
> Objetivo: maximizar rich snippets en Google y la representación del producto en
> asistentes de IA (ChatGPT, Claude, Perplexity).

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 24 | Contenido long-tail + FAQ rich results | Ampliar cobertura de keywords y respuestas directas. | 🟡 | ✅ Done — (a) 3 guías nuevas (Cluster C): `/guias/software-gratis-para-gestionar-donaciones-ong` (Article+FAQPage), `/guias/sistema-de-inventario-para-damnificados` (Article+HowTo) y `/guias/como-registrar-voluntarios-en-un-centro-de-acopio` (Article+HowTo), cada una con Breadcrumb, en el hub `/guias`, sitemap y `llms.txt`; (b) nueva página `/glosario` con `DefinedTermSet` (16 términos del dominio: caja homogénea, tarima, manifiesto, INN, UNSPSC, GS1, régimen de envío, etc.) — imán para búsquedas definicionales y para IA; (c) secciones FAQ visibles + `FAQPage` JSON-LD en los pilares `/centro-de-acopio`, `/ayuda-humanitaria`, `/humanitarian-aid` (EN) y en la home (ES-only, con su schema condicionado al locale). Componente reutilizable `FaqSection` + helper `definedTermSetSchema`. Build y `tsc` verdes; JSON-LD y sitemap verificados contra el server de producción local. |
| 23 | Rich results + visibilidad en IA | Ampliar structured data, unificar OG, enriquecer `llms.txt` y declarar crawlers de IA. | 🟡 | ✅ Done — (a) `src/lib/structured-data.ts` centraliza builders `Article`/`HowTo`/`FAQPage`/`Event`/`BreadcrumbList`/`ItemList` + `SoftwareApplication`/`Organization`, renderizados vía `<JsonLd>` (`src/components/JsonLd.tsx`); (b) las 3 guías ahora emiten `Article`+`HowTo`+`BreadcrumbList` (antes solo 1 tenía `FAQPage`, que se conserva) — extiende task 12; (c) `/eventos/[slug]` emite `Event` (guardado por `start_date`, con `location`/`endDate` opcionales) + `BreadcrumbList` — extiende task 18; (d) nueva página hub `/guias` con `ItemList`+`BreadcrumbList`, agregada al `sitemap.ts` — refuerza task 19; (e) OG social card branded via `next/og` (`app/opengraph-image.tsx` + `app/twitter-image.tsx`) como default por convención de archivo; layout raíz y home omiten `openGraph.images` para usarla — extiende task 7; (f) `llms.txt` enriquecido (guías, `/centro-de-acopio`, `/ayuda-humanitaria`) + nuevo `public/llms-full.txt` con modelo de dominio y reglas de negocio — extiende task 14b; (g) `robots.ts` declara crawlers de IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, etc.) + `host` — extiende task 9. Build de producción y `tsc` verdes; card OG, robots.txt, sitemap y JSON-LD verificados contra el server de producción local. |

---

## Dependencias y notas

- **Task 5** coordina con Fase 6 (task 12) — la sección "Estándares" ya estaba planeada ahí; no duplicar.
- **Task 4 y 18** dependen de que `/necesidades` (Fase 4) ya exista — ✅ ya implementado.
- **Privacy-first**: preferir analytics sin cookies/PII (Plausible/Umami) para mantener la postura de
  "sin datos personales" del producto (CLAUDE.md §2, §9). No introducir tracking invasivo.
- **No canibalizar el dominio con Venezuela**: la capa de captura por evento usa rutas/landings
  específicas, no la home ni los pilares. La identidad del dominio es genérica.

---

## Definition of Done (Fase 11)

- Home y pilares comunican valor genérico (cualquier escenario humanitario), no solo Venezuela.
- `sitemap.xml` + `robots.txt` correctos y enviados a Search Console.
- Páginas públicas con metadata única, OG tags y structured data.
- Al menos 3 guías de contenido publicadas (Cluster C).
- Analytics privacy-friendly midiendo conversión visita → registro.
- Sin regresión de Core Web Vitals en páginas públicas.
