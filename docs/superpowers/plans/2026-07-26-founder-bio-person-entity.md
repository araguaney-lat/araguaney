# Bio del fundador + entidad `Person` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar a Araguaney una entidad autor real y verificable — bio del fundador con enlace a LinkedIn en `/nosotros`, nodo `Person` en el grafo de structured data, y bylines de las guías firmados por esa persona.

**Architecture:** el nombre, la URL y el rol del fundador viven en una sola constante `FOUNDER` en `src/lib/seo.ts`; `src/lib/structured-data.ts` construye un nodo `Person` con `@id` estable a nivel de host y todo lo demás lo referencia por `@id` (`Organization.founder`, `Article.author`). El copy visible vive en el `CONTENT` por locale de `app/[lang]/nosotros/page.tsx`, como el resto de esa página.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Tailwind v4, JSON-LD vía el componente `JsonLd`.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-26-founder-bio-person-entity-design.md`. El copy es literal — no reescribir.
- Nombre público exacto: `Antony Delgado`. No debe quedar ninguna aparición de `Antony E Delgado Casanova`.
- URL del perfil exacta: `https://www.linkedin.com/in/adelgadox/`.
- `@id` del `Person`: `${SITE_URL}/#founder`. `@id` de la Organization: `${SITE_URL}/#organization`. Independientes del locale.
- Enlaces externos: `target="_blank"` + `rel="noopener noreferrer"`.
- No hay framework de tests en el frontend. Cada tarea se verifica con `npx tsc --noEmit`, extracción del JSON-LD renderizado y revisión visual — está explicitado en cada paso.
- El servidor de dev se levanta con `npm run dev` desde `frontend/` y sirve las rutas con prefijo de locale (`/es`, `/en`); `/` devuelve 404 en dev.
- Rama de trabajo: `feat/nosotros-founder-bio` (ya creada, ya contiene el spec).

---

## Estructura de archivos

| Archivo | Responsabilidad tras el cambio |
|---|---|
| `frontend/src/lib/seo.ts` | Fuente única de la identidad del fundador (`FOUNDER`) además de las constantes de marca que ya tiene |
| `frontend/src/lib/structured-data.ts` | Nodo `Person`, `@id` de la Organization, `author` de artículos por referencia |
| `frontend/app/[lang]/nosotros/page.tsx` | Copy ES/EN + markup de la sección "Quién está detrás" + emisión del nodo `Person` |
| `frontend/src/lib/content-dates.ts` | Byline de autor (`authorByline`) |
| `frontend/src/lib/changelog.ts` | Entrada pública en `/novedades` |

Las 6 guías **no se modifican**: ya renderizan `authorByline(locale)` dentro de un `<Link>` a `/nosotros`, así que cambiar la cadena alcanza.

---

### Task 1: identidad del fundador y nodo `Person`

**Files:**
- Modify: `frontend/src/lib/seo.ts:28-30`
- Modify: `frontend/src/lib/structured-data.ts:1-8,18-23,25-60,96-121`

**Interfaces:**
- Consumes: `SITE_URL`, `absoluteUrl` (ya existen en `seo.ts`).
- Produces: `FOUNDER` (objeto con `name`, `url`, `sameAs`, `jobTitle`), `FOUNDER_ID`, `ORGANIZATION_ID` y `founderPersonSchema(locale)` — la Task 2 los consume.

- [ ] **Step 1: reemplazar `BRAND_FOUNDER_NAME` por `FOUNDER` en `seo.ts`**

Sustituir la línea `export const BRAND_FOUNDER_NAME = "Antony E Delgado Casanova"` por:

```ts
// Identidad pública del fundador — señal E-E-A-T. `sameAs` es el perfil externo
// que permite a buscadores y motores de respuesta resolver a la persona como
// entidad. El rol es por locale porque se renderiza también como texto visible.
export const FOUNDER = {
  name: "Antony Delgado",
  url: "https://www.linkedin.com/in/adelgadox/",
  sameAs: ["https://www.linkedin.com/in/adelgadox/"] as readonly string[],
  jobTitle: {
    es: "Ingeniero de Software y responsable de la plataforma",
    en: "Software Engineer, responsible for the platform",
  },
} as const
```

- [ ] **Step 2: verificar que nada más importe la constante vieja**

Run: `cd frontend && grep -rn "BRAND_FOUNDER_NAME" src app`
Expected: solo `src/lib/structured-data.ts` (import en la línea 7 y uso en la 34). Si aparece otro archivo, actualizarlo también en esta tarea.

- [ ] **Step 3: dar `@id` a la Organization y construir el `Person` en `structured-data.ts`**

Cambiar el import de la línea 7 (`BRAND_FOUNDER_NAME` → `FOUNDER`) y añadir, justo antes de `ORGANIZATION_SCHEMA`:

```ts
// @id estables a nivel de host: el mismo nodo se referencia desde /nosotros,
// /en/about y cada guía, en vez de crear una entidad nueva por página.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const FOUNDER_ID = `${SITE_URL}/#founder`

// Referencia ligera al Person. Los consumidores que solo necesitan apuntar al
// autor (Organization.founder, Article.author) usan esto; el nodo completo lo
// emite /nosotros.
const FOUNDER_REF: Schema = { "@type": "Person", "@id": FOUNDER_ID, name: FOUNDER.name }

export function founderPersonSchema(locale: Locale): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": FOUNDER_ID,
    name: FOUNDER.name,
    url: FOUNDER.url,
    jobTitle: FOUNDER.jobTitle[locale],
    sameAs: [...FOUNDER.sameAs],
    worksFor: { "@id": ORGANIZATION_ID },
  }
}
```

En `ORGANIZATION_SCHEMA`, añadir `"@id": ORGANIZATION_ID,` justo después de `"@type": "Organization",` y cambiar la línea 34 por:

```ts
  founder: FOUNDER_REF,
```

- [ ] **Step 4: apuntar el `author` de los artículos a la persona**

En `articleSchema`, cambiar `author: PUBLISHER,` por:

```ts
    // Persona escribe, marca publica — es la separación que Google espera para
    // señales de autoría (E-E-A-T).
    author: FOUNDER_REF,
```

`publisher: PUBLISHER` no cambia.

- [ ] **Step 5: typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 6: commit**

```bash
git add frontend/src/lib/seo.ts frontend/src/lib/structured-data.ts
git commit -m "feat(seo): entidad Person del fundador con @id estable"
```

---

### Task 2: sección "Quién está detrás" en `/nosotros`

**Files:**
- Modify: `frontend/app/[lang]/nosotros/page.tsx:41-42` (tipo `Content`), `:86-88` (copy ES), `:130-132` (copy EN), `:173-176` (structured data), `:283-293` (markup)

**Interfaces:**
- Consumes: `FOUNDER` de `seo.ts`, `founderPersonSchema` de `structured-data.ts` (Task 1).
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: ampliar el tipo `Content`**

Reemplazar en la interfaz `Content` las dos líneas `founderH2: string` / `founderP: string` por:

```ts
  founderH2: string
  founderRole: string
  founderBio: string
  founderQuote: string
  founderFreeTitle: string
  founderFreeBody: string
  founderLinkLabel: string
```

- [ ] **Step 2: copy en español**

Reemplazar el bloque `founderH2` / `founderP` del objeto `es` por:

```ts
    founderH2: "Quién está detrás",
    founderRole: "Ingeniero de Software y responsable de la plataforma detrás de Araguaney",
    founderBio:
      "Llevo más de 20 años en tecnología como desarrollador de software, resolviendo problemas concretos de operación. Hoy lidero un departamento global de gestión de incidencias tecnológicas en una empresa internacional: sistemas que tienen que funcionar cuando algo se rompe y hay gente esperando. Araguaney está construido con ese mismo criterio.",
    founderQuote:
      "Araguaney no nació en una oficina. Nació organizando donaciones para Venezuela tras el terremoto de junio de 2026, apoyando en varias etapas del proceso. Ahí vi las dos caras: personas dando todo para que la ayuda llegara a destino, y una logística que se atoraba por falta de orden — cajas armadas sin criterio, inventarios en papel y requisitos de envío internacional imposibles de cubrir a tiempo. Esa energía merece una herramienta a la altura. Eso es Araguaney, y es gratuito para quien lo necesite.",
    founderFreeTitle: "Araguaney es gratuito, y va a seguir siéndolo.",
    founderFreeBody:
      "Sin licencias, sin límite de cajas y sin costo para centros de acopio ni coordinaciones humanitarias. La herramienta no cobra por ordenar la ayuda.",
    founderLinkLabel: "LinkedIn ↗",
```

- [ ] **Step 3: copy en inglés**

Reemplazar el bloque `founderH2` / `founderP` del objeto `en` por:

```ts
    founderH2: "Who's behind it",
    founderRole: "Software Engineer, responsible for the platform behind Araguaney",
    founderBio:
      "I've spent over 20 years in technology as a software developer, solving concrete operational problems. Today I lead a global technology incident management department at an international company: systems that have to work when something breaks and people are waiting. Araguaney is built to that same standard.",
    founderQuote:
      "Araguaney wasn't born in an office. It was born while organizing donations for Venezuela after the June 2026 earthquake, supporting several stages of the process. There I saw both sides: people giving everything to get aid to its destination, and logistics that jammed for lack of order — boxes packed without criteria, inventories on paper, and international shipping requirements impossible to meet in time. That energy deserves a tool to match. That's Araguaney, and it's free for whoever needs it.",
    founderFreeTitle: "Araguaney is free, and it will stay free.",
    founderFreeBody:
      "No licenses, no box limits and no cost for collection centers or humanitarian coordination teams. The tool doesn't charge for putting aid in order.",
    founderLinkLabel: "LinkedIn ↗",
```

- [ ] **Step 4: markup de la sección**

Reemplazar el contenido del `div` interno del bloque `{/* ── Founder ── */}` (el `max-w-[720px] mx-auto` con el `h2` y el `p`) por:

```tsx
          <div className="max-w-[720px] mx-auto">
            <h2 className="text-[18px] md:text-[22px] mb-3" style={{ fontFamily: "var(--font-source-serif)", fontWeight: 600, margin: "0 0 12px" }}>
              {c.founderH2}
            </h2>

            <div className="text-[16px] md:text-[18px]" style={{ fontWeight: 600, color: "#2B2723" }}>
              {FOUNDER.name}
            </div>
            <div className="text-[13.5px] mb-4 flex flex-wrap items-center gap-x-2" style={{ color: "#6E6557" }}>
              <span>{c.founderRole}</span>
              <span aria-hidden>·</span>
              <a
                href={FOUNDER.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1F5E8C", fontWeight: 600 }}
              >
                {c.founderLinkLabel}
              </a>
            </div>

            <p className="text-[14.5px] md:text-[16px] mb-5" style={{ color: "#5C5347", lineHeight: 1.65 }}>
              {c.founderBio}
            </p>

            <blockquote
              className="text-[14.5px] md:text-[16px] pl-4 mb-6"
              style={{ borderLeft: "2px solid #EAD9B0", color: "#5C5347", lineHeight: 1.65, fontStyle: "italic", margin: "0 0 24px" }}
            >
              {c.founderQuote}
            </blockquote>

            <div className="p-4 rounded-xl" style={{ background: "#FBEFC9", border: "1px solid #EAD9B0" }}>
              <div className="text-[14.5px] md:text-[15.5px]" style={{ fontWeight: 700, color: "#2B2723", marginBottom: 4 }}>
                {c.founderFreeTitle}
              </div>
              <div className="text-[13.5px] md:text-[14.5px]" style={{ color: "#5C5347", lineHeight: 1.6 }}>
                {c.founderFreeBody}
              </div>
            </div>
          </div>
```

- [ ] **Step 5: importar `FOUNDER` y emitir el nodo `Person`**

Añadir `FOUNDER` al import de `@/lib/seo` y `founderPersonSchema` al import de `@/lib/structured-data`, y agregar `founderPersonSchema(locale)` al array `structuredData` que la página ya construye.

- [ ] **Step 6: typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 7: verificar el render y el JSON-LD**

Run (con `npm run dev` levantado):

```bash
curl -s http://localhost:3000/es/nosotros | grep -o 'Antony Delgado' | head -3
curl -s http://localhost:3000/es/nosotros | grep -o '"@type":"Person"[^}]*}' | head -2
curl -s http://localhost:3000/en/about | grep -o 'Software Engineer[^<"]*' | head -2
```

Expected: el nombre aparece en el HTML; el JSON-LD incluye un `Person` con `"@id":"https://www.araguaney.lat/#founder"`; la versión EN muestra el rol en inglés.

- [ ] **Step 8: commit**

```bash
git add frontend/app/\[lang\]/nosotros/page.tsx
git commit -m "feat(nosotros): bio del fundador, historia de origen y compromiso de gratuidad"
```

---

### Task 3: bylines de las guías

**Files:**
- Modify: `frontend/src/lib/content-dates.ts:41-44`

**Interfaces:**
- Consumes: `FOUNDER.name` de `seo.ts` (Task 1).
- Produces: `authorByline(locale)` con el nombre real — las 6 guías ya lo renderizan dentro de un `<Link>` a `/nosotros`, no se tocan.

- [ ] **Step 1: cambiar el byline**

Reemplazar la función por:

```ts
/** Byline de autor por locale (las guías ya lo enlazan a /nosotros — E-E-A-T). */
export function authorByline(locale: Locale): string {
  return locale === "es" ? `Por ${FOUNDER.name}` : `By ${FOUNDER.name}`
}
```

Añadir `import { FOUNDER } from "@/lib/seo"` al inicio del archivo.

- [ ] **Step 2: typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sin salida.

- [ ] **Step 3: verificar en una guía (ES y EN)**

Run:

```bash
curl -s http://localhost:3000/es/guias/que-se-puede-donar | grep -o 'Por Antony Delgado'
curl -s http://localhost:3000/es/guias/que-se-puede-donar | grep -o '"author":{[^}]*}'
```

Expected: el byline visible dice "Por Antony Delgado"; el `author` del schema apunta a `"@id":"https://www.araguaney.lat/#founder"`.

- [ ] **Step 4: commit**

```bash
git add frontend/src/lib/content-dates.ts
git commit -m "feat(seo): guías firmadas por el autor real en vez del equipo"
```

---

### Task 4: entrada en `/novedades` y verificación final

**Files:**
- Modify: `frontend/src/lib/changelog.ts` (nueva entrada al principio del array)

**Interfaces:**
- Consumes: el tipo `ChangelogEntry` que ya existe en el archivo.
- Produces: nada.

- [ ] **Step 1: añadir la entrada del changelog**

Insertar como **primer** elemento de `CHANGELOG` (el array va de más nuevo a más viejo):

```ts
  {
    date: "2026-07-26",
    tag: "improvement",
    es: {
      title: "Quién está detrás de Araguaney",
      body: "La página Nosotros ahora dice quién construye y responde por la plataforma, con su perfil público, y deja explícito el compromiso: Araguaney es gratuito y va a seguir siéndolo.",
    },
    en: {
      title: "Who's behind Araguaney",
      body: "The About page now says who builds and answers for the platform, with a public profile, and makes the commitment explicit: Araguaney is free and will stay free.",
    },
  },
```

- [ ] **Step 2: no debe quedar rastro del nombre viejo ni del autor genérico**

Run: `cd frontend && grep -rn "Antony E Delgado Casanova\|equipo de Araguaney\|Araguaney team" src app`
Expected: sin coincidencias.

- [ ] **Step 3: typecheck y verificación de `/novedades`**

Run:

```bash
cd frontend && npx tsc --noEmit
curl -s http://localhost:3000/es/novedades | grep -o 'Quién está detrás de Araguaney'
```

Expected: typecheck sin salida; el título aparece en el HTML.

- [ ] **Step 4: verificar que `/nosotros` no introduce overflow horizontal en móvil**

Con el dev server levantado, correr la misma sonda del PR #155 a 320/360/390px sobre `/es/nosotros` y `/en/about`.
Expected: `document.documentElement.scrollWidth === window.innerWidth` en los tres anchos.

- [ ] **Step 5: revisión visual de la sección**

Captura de `/es/nosotros` a 390px y a 1280px.
Expected: nombre, rol y enlace en una línea legible (el rol envuelve en móvil sin cortar el `·`), la cita con su borde izquierdo, y la caja dorada de gratuidad completa dentro del ancho.

- [ ] **Step 6: commit**

```bash
git add frontend/src/lib/changelog.ts
git commit -m "docs(novedades): entrada del bloque 'quién está detrás'"
```

---

## Self-review

**Cobertura del spec:** sección 3 (copy ES/EN + cierre de gratuidad) → Task 2; sección 4 (estructura visual) → Task 2 step 4; sección 5 (`FOUNDER`, `Person`, `@id` de Organization, `author`) → Task 1; sección 6 (bylines) → Task 3; DoD de "sin rastro del nombre viejo" y overflow → Task 4.

**Desviación respecto al spec:** el spec preveía extraer un componente `AuthorByline` si el markup se repetía en las 6 guías. No hace falta: las guías ya envuelven `authorByline(locale)` en un `<Link>` a `/nosotros`, así que cambiar la cadena alcanza. Menos cambio, mismo resultado.

**Consistencia de tipos:** `FOUNDER.jobTitle` es `Record<Locale, string>` y se consume con `FOUNDER.jobTitle[locale]` en `founderPersonSchema`; `FOUNDER_REF` y `founderPersonSchema` comparten `FOUNDER_ID`; `authorByline` usa `FOUNDER.name`, el mismo valor que el `name` del nodo `Person`.
