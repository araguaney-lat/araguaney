# Fase 17 — Answer Engine Optimization (AEO/GEO) y expansión de keywords

> Segunda ola de posicionamiento, aditiva sobre la **Fase 11** (que dejó cerrado el SEO
> técnico: metadata, OG, sitemap, robots, canonical, hreflang, schema.org, `llms.txt`,
> `llms-full.txt`, guías, glosario, landings por categoría, GSC y GA4).
>
> **Objetivo:** pasar de "rankear en Google" a **ser citado por los motores de respuesta de IA**
> (ChatGPT Search, Perplexity, Google AI Overviews, Gemini, Copilot) y cubrir los huecos de
> keyword de intención comercial y expansión geográfica que Fase 11 no atacó.

> Basado en investigación de mercado y revisión del código (julio 2026). Ver "Hallazgos" abajo.

> **Mantenimiento del día a día:** ver `docs/seo-maintenance.md` — los 3 hábitos recurrentes
> (apendar a `/novedades`, refrescar `dateModified` trimestral, sumar anclas `sameAs`).

---

## Hallazgos de la investigación (julio 2026)

### Hallazgo 1 — El grounding de la IA pasa por Bing, y solo tenemos Google

ChatGPT Search y Microsoft Copilot **se sirven del índice de Bing** como capa de retrieval. Una
página ausente de Bing es invisible para dos de los mayores motores de respuesta de IA, por bien
que rankee en Google. Fase 11 solo verificó **Google** Search Console. **Bing Webmaster Tools +
IndexNow** son el hueco #1 de visibilidad en IA. (IndexNow: ~22% de las URLs clicadas en Bing
vienen de envíos IndexNow; Google no lo soporta, así que es ventaja Bing-and-friends.)

### Hallazgo 2 — Señales de entidad > backlinks para citas de IA

Las menciones de marca correlacionan **0.664** con citas en AI Overviews, vs **0.218** de los
backlinks tradicionales. La señal más barata y de mayor impacto es la **entidad**: `sameAs`,
QID de Wikidata y Organization schema enriquecido. **Revisión del código:** nuestro
`ORGANIZATION_SCHEMA` (`src/lib/structured-data.ts`) **no tiene `sameAs`, ni `foundingDate`,
ni `founder`** — cero anclas de entidad hacia fuentes autoritativas.

### Hallazgo 3 — La frescura decide la cita

Las páginas no actualizadas trimestralmente pierden citas de IA a **3x** la tasa normal. Nuestras
guías emiten `Article`/`HowTo` pero **sin `dateModified` visible** ni cadencia de refresco.

### Hallazgo 4 — `llms.txt` sirve poco por sí solo, pero el estándar 2026 pide más

Ningún gran proveedor (OpenAI, Google, Anthropic) confirma leer `llms.txt` en producción; su
impacto directo es marginal. El valor real está en **contenido extraíble + entidad + frescura**.
Aun así, la buena práctica 2026 es descripciones más específicas (qué pregunta responde cada
página), granularidad por-crawler y actualización trimestral. Nuestro `llms.txt` es una lista
plana y **hardcodea `https://araguaney.lat`** (ver Hallazgo 5).

### Hallazgo 5 — Split de host canónico (bug real)

`SITE_URL` cae por defecto en `https://araguaney.lat` (sin `www`) y `llms.txt` lo hardcodea así,
pero **Google Search Console se verificó sobre `https://www.araguaney.lat`** (Fase 11, task 20).
Dos hosts compitiendo diluyen autoridad y confunden el canónico. Hay que **elegir un host único**
y hacer que `SITE_URL`, `robots.host`, sitemap, canonicals, `llms.txt`, GSC y el 301 concuerden.

### Hallazgo 6 — Huecos de keyword no atacados en Fase 11

Fase 11 cubrió head terms, informacional (guías) y captura por evento. **Faltan:**
intención **comercial/comparativa** (fondo de embudo — donde la IA ama tablas "vs"),
**escenarios** como landings evergreen, y **expansión geográfica** (México y LATAM).

---

## Clusters de keywords nuevos

### Cluster E — Comparativa / intención comercial (fondo de embudo, alta conversión + AEO)

| Keyword (ES) | Keyword (EN) | Intención |
|---|---|---|
| alternativa a Excel para donaciones | donation spreadsheet alternative | comparativa ★ |
| mejor software para centro de acopio | best donation center software | comparativa ★ |
| hoja de cálculo vs software de acopio | spreadsheet vs inventory software | comparativa |
| software de acopio gratis vs de pago | free vs paid relief software | comparativa |

### Cluster F — Escenarios (evergreen, mapea a pilar + `/necesidades`)

- software para acopio por inundaciones
- gestión de donaciones tras un incendio
- logística de ayuda para crisis migratoria
- inventario de acopio para sismo / terremoto

### Cluster G — Geográfico (México + LATAM)

- centro de acopio México / CDMX / Monterrey / Guadalajara
- donación de medicamentos COFEPRIS (reglas locales MX)
- aduana México ayuda humanitaria (SAT / régimen de importación)
- centro de acopio [Chile / Colombia / Perú] (expansión LATAM)

### Cluster H — Preguntas directas (AEO / People-Also-Ask / voz)

- ¿qué es un centro de acopio y cómo funciona?
- ¿cómo se hace un manifiesto de donaciones?
- ¿qué medicamentos se pueden donar?
- ¿cómo organizar voluntarios en una emergencia?

---

## Tareas

### Grupo A — Grounding en motores de respuesta de IA

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 1 | Bing Webmaster Tools | Verificar el dominio, enviar `sitemap.xml`. Bing alimenta ChatGPT Search + Copilot: sin esto somos invisibles a dos de los mayores motores de IA. | 🟠 | ✅ Done — dominio `www.araguaney.lat` verificado en Bing Webmaster Tools y `sitemap.xml` enviado (confirmado en la sección *Sitemaps*). Paso manual del usuario. |
| 2 | IndexNow | Ping a IndexNow (Bing/Yandex) al publicar/actualizar contenido (endpoint + key en `public/`, o hook en el flujo de deploy). Indexación casi instantánea → entra antes a la capa de grounding de IA. | 🟡 | ✅ Done — **ping on-publish desde el backend**: al crear una campaña pública (`is_active`, no `is_general` — el mismo filtro que expone `/eventos/{slug}`), `CampaignService.create` encola `submit_indexnow_task` (ARQ) que pinguea IndexNow para `/eventos/{slug}`. Key file público en `frontend/public/9c4a1e7b6f0d42a8b3e5c8d1f2a06b7e.txt`; `app/utils/indexnow.py` (httpx async, no-op sin key o en host no público). Config `INDEXNOW_KEY` (Railway). 8 tests (servicio: pinguea solo públicas; util: no-op/post/errores). **Paso manual:** setear `INDEXNOW_KEY` en Railway = valor del key file. |
| 3 | Modernizar `llms.txt` al estándar 2026 | Descripciones más específicas (qué pregunta responde cada página, dato único, para quién), nota de última actualización, y sincronizar el host canónico (ver task 4). Extiende Fase 11 task 14b/23. | 🟡 | ✅ Done — `llms.txt` y `llms-full.txt` con nota `> Última actualización: 2026-07-24` (frescura) + descripciones reescritas en formato "qué pregunta responde / para quién" (Inicio, Cómo funciona, Centro de acopio, Alternativa a Excel, guías…). Host ya en www (task 4). Verificado: cero URLs no-www, notas presentes en ambos. |
| 4 | Resolver split de host canónico (`www` vs no-`www`) | **Bug real.** Elegir un host único; alinear `SITE_URL`, `robots.host`, `sitemap`, `alternates.canonical`, `llms.txt`/`llms-full.txt`, GSC y un redirect 301 permanente. Verificar que no queden URLs mixtas. | 🟠 | ✅ Done — host canónico = **`www.araguaney.lat`** (producción ya hacía 308 apex→www y GSC estaba verificado en www, pero el `<link rel="canonical">` renderizaba el apex no-www — apuntaba a la URL que redirige). Fix: `SITE_URL` default → www (de ahí derivan `metadataBase`, canonicals, `sitemap`, `robots.host` vía `absoluteUrl`) + `llms.txt`/`llms-full.txt` reescritos a www (únicos hosts hardcodeados; los `@araguaney.lat` son `mailto`, intactos). El 301/308 apex→www ya existía en el edge. `tsc` verde. **Paso manual de deploy:** setear `NEXT_PUBLIC_SITE_URL=https://www.araguaney.lat` en Vercel para blindar contra el default. |

### Grupo B — Entidad y autoridad (knowledge graph)

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 5 | Enriquecer `Organization` con `sameAs` + `foundingDate` + `founder` | Anclar la entidad a perfiles autoritativos (LinkedIn, GitHub, X/Instagram, Crunchbase). Señal de entidad = mayor correlación con citas de IA que los backlinks. | 🟠 | ✅ Done — `foundingDate: "2026"` + `founder` (referencia al nodo `Person` del fundador, `@id` `SITE_URL/#founder`) + `sameAs` = LinkedIn (`company/araguaney-lat`) y GitHub (`github.com/araguaney-lat`), todo en `ORGANIZATION_SCHEMA`. `sameAs` vive en `BRAND_SAME_AS` (`seo.ts`, fuente única de verdad, solo se emite si no está vacío). Agregar más perfiles (X, Instagram, Crunchbase) o el QID de Wikidata (task 6) es una línea cada uno. **Ampliado (2026-07-26):** el fundador es ahora un nodo `Person` completo (`founderPersonSchema`) con `@id` estable, `sameAs` a su LinkedIn personal y `worksFor` → `Organization` (que también recibió `@id`). |
| 6 | Entrada en Wikidata (QID) | Crear la entidad en Wikidata y enlazarla vía `sameAs`. Entidad "home" que Google/IA usan para resolver la marca. Costo bajo, impacto alto. | 🟢 | ⬜ |
| 7 | Página `/nosotros` (entity home / about) | Misión, autoría/equipo, estándares que respaldamos, `sameAs`. Refuerza E-E-A-T y da un ancla de entidad indexable. Con `AboutPage`/`Organization` schema. | 🟡 | ✅ Done — página bilingüe `/nosotros` (EN `/about`): hero/misión, por qué existe, cómo lo hacemos (4 pasos), estándares (WHO/IFRC/IOM/UNSPSC/GS1), privacidad por diseño, sección "Quién está detrás" (bio del fundador, historia de origen y compromiso de gratuidad — ampliada el 2026-07-26), CTA + cross-links. Emite `ORGANIZATION_SCHEMA` (con `sameAs`/founder/foundingDate — entity home) + nuevo `aboutPageSchema` + `BreadcrumbList`. Registrada en `routes.ts` + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + **enlace en el footer** (`HomeFooter`). Verificado corriendo el build: ES/EN 200, schema con founder+sameAs, canonical www, hreflang es/en/x-default. Destino para las bylines de la task 9. Spec: `docs/superpowers/specs/2026-07-24-nosotros-entity-home-design.md`. |
| 8 | Menciones de marca / directorios | Alta en directorios relevantes: Product Hunt, listados de tecnología humanitaria, Digital Public Goods, ReliefWeb/HDX, catálogos de software. Menciones de marca > backlinks para IA. | 🟡 | ⬜ |
| 9 | Autoría E-E-A-T en guías | `author` + enlace a `/nosotros` en las 6 guías (bylines). Señal de experiencia/autoridad para rich results y citas. | 🟢 | ✅ Done — byline visible en las 6 guías junto a la fecha: "Por Antony Delgado" (ES) / "By Antony Delgado" (EN), enlazado a `/nosotros` (helper `authorByline` en `content-dates.ts`). El `author` del `Article` schema referencia al nodo `Person` del fundador por `@id`; `publisher` sigue siendo la Organization (persona escribe, marca publica). Verificado corriendo el build: byline presente en las 6, enlaza a `/nosotros` (ES) / `/en/about` (EN). |

### Grupo C — Expansión de keywords y contenido

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 10 | Cluster comparativo / intención comercial | Página(s) tipo "alternativa a Excel/hoja de cálculo para donaciones" y "mejor software para centro de acopio" con **tabla comparativa** (la IA cita tablas). Fondo de embudo. Cluster E. | 🟠 | ✅ Done — página pilar bilingüe `/alternativa-a-excel-para-donaciones` (EN `/en/donation-spreadsheet-alternative`): hero, "por qué la hoja se queda corta", **tabla comparativa** de 10 filas (Hoja/WhatsApp vs Araguaney), sección honesta "¿cuándo alcanza una hoja?", FAQ (`FAQPage`) y CTA. Sin nombrar competidores (comparación vs Excel/Sheets/WhatsApp). Registrada en `routes.ts` + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt`; `FAQPage`+`BreadcrumbList` JSON-LD; internal linking recíproco con `/centro-de-acopio` y la guía "software gratis". Spec: `docs/superpowers/specs/2026-07-24-comparison-page-excel-alternative-design.md`. Verificado corriendo el build de producción (ES/EN 200, canonical www, hreflang es/en/x-default). |
| 11 | Landings por escenario (evergreen) | Rutas evergreen para inundaciones / incendios / crisis migratoria / sismo, cada una mapeando al pilar y a `/necesidades`. Cluster F. Distinto de `/eventos/[slug]` (efímero por campaña). | 🟡 | ✅ Done — ruta única dinámica `/escenarios/[scenario]` (EN `/scenarios/[scenario]`) mirroreando `/necesidades/[category]` (ISR `revalidate=300`, sin `generateStaticParams`, `notFound` en slug inválido). Data file bilingüe `src/lib/scenarios.ts` con los 4 escenarios; cada uno: hero, "qué se necesita" (3-4 categorías enlazando a `/necesidades/[cat]`), "cómo ayuda Araguaney", CTA + cross-links. 4 `RouteKey` en `routes.ts` + matcher `/escenarios/:path*`·`/scenarios/:path*` + `sitemap.ts` + `llms.txt`/`llms-full.txt`. El pilar `/ayuda-humanitaria` ahora **enlaza** sus 4 tarjetas de escenario a las landings. `BreadcrumbList`. Verificado corriendo el build: 4 escenarios ES/EN 200, slug inválido 404, canonical www, hreflang es/en/x-default, pilar enlaza a los 4. Spec: `docs/superpowers/specs/2026-07-24-scenario-landings-design.md`. |
| 12 | Expansión geográfica (MX + LATAM) | Contenido/landings para México (COFEPRIS, aduana SAT, ciudades) y expansión LATAM. Cluster G. Reforzar `areaServed` en schema. | 🟡 | ✅ Done — **una** landing sustanciosa `/centro-de-acopio-mexico` (EN `/collection-center-mexico`), NO stubs por ciudad (evita thin/doorway pages): hero (menciona CDMX/Monterrey/Guadalajara), COFEPRIS (identificación de medicamentos), aduana/SAT (importación humanitaria, con nota "no es asesoría legal" + enlace a la guía de aduana), cómo ayuda, CTA + cross-links. `areaServed` del `Organization` reforzado de "América Latina" a lista con 6 países (MX, VE, CO, CL, PE, AR). `routes.ts` + matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt`; la guía de aduana enlaza de vuelta a México. **Estrategia de evolución** documentada: países siguientes uno a uno, gated por contenido regulatorio local real + demanda; refactor a ruta `/[pais]` data-driven solo al llegar a ~4-5 países con sustancia. Verificado: ES/EN 200, COFEPRIS/SAT, hreflang, areaServed con 6 Country. Spec: `docs/superpowers/specs/2026-07-24-mexico-geo-landing-design.md`. |
| 13 | Hub `/preguntas-frecuentes` | Agregar todas las FAQ del sitio en un hub con `FAQPage`, formato pregunta-respuesta directo (AEO / PAA / voz). Cluster H. Enlazado en internal linking. | 🟡 | ✅ Done — página bilingüe `/preguntas-frecuentes` (EN `/faq`): **16 Q&A curadas** en 4 grupos (Producto, Donaciones/reglas, Operación, Privacidad), un solo `FAQPage` que agrega todas + `BreadcrumbList`, sección de cross-links. Enfoque curado (no copia literal de las ~32 dispersas). `routes.ts` + `middleware` matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + **enlace en el footer**. Verificado corriendo el build: ES/EN 200, 16 Questions en el `FAQPage`, canonical www, hreflang es/en/x-default. Spec: `docs/superpowers/specs/2026-07-24-faq-hub-design.md`. |
| 14 | Títulos/meta en formato pregunta | En páginas clave, incluir la pregunta en `title`/`description` (buena práctica AEO: la IA extrae mejor cuando la pregunta está en el título). | 🟢 | ✅ Done — meta `description` reescrita para **liderar con la pregunta objetivo** en `centro-de-acopio` ("¿Qué es un centro de acopio y qué software necesita?"), `ayuda-humanitaria` ("¿Qué software sirve para donaciones de emergencia?"), `como-funciona` ("¿Cómo funciona, del acopio al envío?") — ES+EN; `alternativa-a-excel` ya lo hacía. Enfoque conservador: NO se tocan los `metaTitle` que ya rankean (las descriptions no rankean, ayudan a CTR/extracción por IA). Verificado corriendo el build. |

### Grupo D — Frescura y multimedia

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 15 | `dateModified` + fecha visible + cadencia de refresco | `datePublished`/`dateModified` en `Article`/`HowTo` y fecha "Actualizado" visible en guías. Definir refresco trimestral (frescura = 3x citas de IA). | 🟠 | ✅ Done — fuente única `src/lib/content-dates.ts` (`CONTENT_DATES` por `RouteKey` + `formatContentDate`/`updatedLabel`); builders `articleSchema`/`howToSchema` aceptan y emiten `datePublished`/`dateModified`; las **6 guías** emiten ambas fechas y muestran "Actualizado {fecha}" (ES) / "Updated {date}" (EN) bajo el H1. Cadencia: bumpear `modified` al refrescar contenido, **trimestral** (documentado en `content-dates.ts`). Verificado con build + server: fecha visible ES/EN + `datePublished 2026-07-21`/`dateModified 2026-07-24` en el JSON-LD. |
| 16 | Changelog público `/novedades` | Notas de producto públicas — señal de frescura recurrente + captura de keywords de features. | 🟢 | ✅ Done — página bilingüe `/novedades` (EN `/whats-new`): lista cronológica (newest first) con fecha + tag (Nuevo/Mejora/Fix) + título + descripción, y la fecha de la última entrada visible en el hero (señal de frescura). Data file curado `src/lib/changelog.ts` (fuente única, se apenda al lanzar features), seed con 7 notas reales user-facing (panel nacional, manifiesto+QR, transferencias, mensajería, reportes, auto-registro, deliverability). Reusa `formatContentDate`. `routes.ts` + matcher + `sitemap.ts` + `llms.txt`/`llms-full.txt` + **enlace en el footer**. `BreadcrumbList`. Verificado corriendo el build: ES/EN 200, 7 entradas fechadas, canonical www, hreflang. **Mantenimiento:** apendar una entrada al lanzar cada feature. Spec: `docs/superpowers/specs/2026-07-24-changelog-novedades-design.md`. |
| 17 | Video demo + `VideoObject` | Video corto del flujo acopio→envío (YouTube embebido) con `VideoObject` schema. La IA cita cada vez más contenido en video. | 🟢 | ⬜ |
| 18 | `speakable` schema | Marcar respuestas/FAQ con `speakable` para asistentes de voz. Bajo costo, complementa el Cluster H. | 🟢 | ✅ Done — `faqSchema` emite `SpeakableSpecification` con `cssSelector` `[".faq-q", ".faq-a"]`, y `FaqSection` rendea esas clases en pregunta/respuesta. Como todas las páginas con FAQ (hub, pilares, guías) usan `FaqSection`, el `speakable` queda cubierto en **todas** de un solo cambio (DRY). Verificado: presente en `/preguntas-frecuentes` y en pilares con FAQ. |

### Grupo E — Medición de visibilidad en IA

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 19 | Monitoreo de citas en IA | Set fijo de prompts (head terms + comparativas, ES/EN) corridos mensualmente en ChatGPT/Perplexity/Gemini/AI Overviews; registrar si Araguaney es citado y con qué página. Complementa el rank tracking de Google (Fase 11 task 22). | 🟠 | ⬜ |
| 20 | Analítica de Bing | Cobertura e impresiones en Bing Webmaster Tools (complementa GSC). Depende de la task 1. | 🟢 | ⬜ |
| 21 | KPIs de AEO | Definir métricas más allá de la posición en Google: share-of-voice en respuestas de IA, menciones de marca y citas. Revisar con las tasks 19–20. | 🟢 | ⬜ |

---

## Dependencias y notas

- **Task 4 (host canónico)** debe ir **antes** de la task 3 (`llms.txt`) y de cualquier envío nuevo
  a Bing (task 1), para no sembrar el host equivocado en más lugares.
- **Task 20** depende de la task 1 (Bing verificado).
- **Task 9** depende de la task 7 (`/nosotros` como destino de las bylines).
- **Privacy-first** (CLAUDE.md §2, §9): mantener la postura "sin PII". El monitoreo de IA (task 19)
  es un proceso manual/externo, no tracking de usuarios.
- **No canibalizar el dominio con un evento**: las landings por escenario (task 11) son evergreen y
  agnósticas de país; la captura por evento sigue en `/eventos/[slug]`.

---

## Definition of Done (Fase 17)

- Dominio verificado en Bing + sitemap enviado; IndexNow operativo.
- Host canónico único, sin URLs `www`/no-`www` mixtas; `llms.txt` alineado y modernizado.
- `Organization` con `sameAs` a ≥3 perfiles autoritativos + entrada en Wikidata.
- Al menos una página comparativa (Cluster E) y las landings por escenario (Cluster F) publicadas.
- Guías con `dateModified` visible y cadencia de refresco definida.
- Proceso mensual de monitoreo de citas en IA en marcha, con KPIs de AEO definidos.
- Sin regresión de Core Web Vitals ni introducción de PII.
