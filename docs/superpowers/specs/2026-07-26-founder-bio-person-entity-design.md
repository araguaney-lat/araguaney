# Bio del fundador + entidad `Person` (autoría E-E-A-T)

**Fecha:** 2026-07-26
**Estado:** aprobado (pendiente de implementación)
**Motivación:** la sección "Quién está detrás" de `/nosotros` es hoy una línea
institucional sin persona verificable detrás. Google y los motores de respuesta
resuelven la confianza de un sitio a través de una entidad autor real,
enlazada a perfiles externos (`sameAs`). Hoy el sitio no tiene ninguna.

---

## 1. Alcance

Tres piezas, en un solo PR:

1. Sección "Quién está detrás" de `/nosotros`: bio ampliada + historia de origen
   en primera persona + enlace al LinkedIn personal.
2. Entidad `Person` en structured data, referenciada como `founder` de la
   Organization y como `author` de las guías.
3. Bylines de las 6 guías: de "Por el equipo de Araguaney" a "Por Antony
   Delgado", enlazado a `/nosotros`.

**Fuera de alcance (a propósito):** foto/retrato, página `/autor` propia,
GitHub personal en `sameAs`. Los perfiles de la organización
(`linkedin.com/company/araguaney-lat`, `github.com/araguaney-lat`) ya viven en
`BRAND_SAME_AS` y no se tocan.

---

## 2. Datos del fundador

| Campo | Valor |
|---|---|
| Nombre público | `Antony Delgado` (reemplaza `Antony E Delgado Casanova`) |
| Rol | ES: `Ingeniero de Software y responsable de la plataforma` · EN: `Software Engineer, responsible for the platform` |
| `sameAs` / `url` | `https://www.linkedin.com/in/adelgadox/` |
| Año de fundación | `2026` (ya existe, `BRAND_FOUNDING_YEAR`) |

---

## 3. Copy aprobado

Tono: cercano y directo. La bio va en primera persona; la historia de origen va
entrecomillada y marcada visualmente como testimonio. El resto de `/nosotros`
mantiene la voz institucional ("Somos el estándar") — el contraste es
intencional y es lo que hace creíble el bloque.

### Español

**H2:** Quién está detrás

**Nombre + rol:** Antony Delgado — Ingeniero de Software y responsable de la
plataforma detrás de Araguaney · LinkedIn ↗

**Bio:**

> Llevo más de 20 años en tecnología como desarrollador de software, resolviendo
> problemas concretos de operación. Hoy lidero un departamento global de gestión
> de incidencias tecnológicas en una empresa internacional: sistemas que tienen
> que funcionar cuando algo se rompe y hay gente esperando. Araguaney está
> construido con ese mismo criterio.

**Historia de origen (entrecomillada):**

> "Araguaney no nació en una oficina. Nació organizando donaciones para Venezuela
> tras el terremoto de junio de 2026, apoyando en varias etapas del proceso. Ahí
> vi las dos caras: personas dando todo para que la ayuda llegara a destino, y una
> logística que se atoraba por falta de orden (cajas armadas sin criterio,
> inventarios en papel y requisitos de envío internacional imposibles de cubrir a
> tiempo). Esa energía merece una herramienta a la altura. Eso es Araguaney, y es
> gratuito para quien lo necesite."

**Cierre — compromiso de gratuidad (fuera de la cita, en destaque):**

> **Araguaney es gratuito, y va a seguir siéndolo.** Sin licencias, sin límite de
> cajas y sin costo para centros de acopio ni coordinaciones humanitarias. La
> herramienta no cobra por ordenar la ayuda.

### Inglés

**H2:** Who's behind it

**Nombre + rol:** Antony Delgado — Software Engineer, responsible for the
platform behind Araguaney · LinkedIn ↗

**Bio:**

> I've spent over 20 years in technology as a software developer, solving
> concrete operational problems. Today I lead a global technology incident
> management department at an international company: systems that have to work
> when something breaks and people are waiting. Araguaney is built to that same
> standard.

**Historia de origen (entrecomillada):**

> "Araguaney wasn't born in an office. It was born while organizing donations for
> Venezuela after the June 2026 earthquake, supporting several stages of the
> process. There I saw both sides: people giving everything to get aid to its
> destination, and logistics that jammed for lack of order (boxes packed without
> criteria, inventories on paper, and international shipping requirements
> impossible to meet in time). That energy deserves a tool to match. That's
> Araguaney, and it's free for whoever needs it."

**Cierre — compromiso de gratuidad (fuera de la cita, en destaque):**

> **Araguaney is free, and it will stay free.** No licenses, no box limits and no
> cost for collection centers or humanitarian coordination teams. The tool
> doesn't charge for putting aid in order.

---

## 4. Estructura visual

La sección conserva el contenedor actual (`max-w-[720px] mx-auto`, fondo `#fff`,
borde superior `#EFE7D6`). Dentro:

```
<h2>  Quién está detrás
<div> Antony Delgado                      ← 16/18px, weight 600, color #2B2723
      <rol> · <a LinkedIn ↗>              ← 13.5px, #6E6557; link en #1F5E8C
<p>   bio                                  ← 14.5/16px, #5C5347, line-height 1.65
<blockquote> historia de origen            ← borde izquierdo 2px #EAD9B0,
                                             padding-left 16px, itálica, #5C5347
<div> compromiso de gratuidad              ← caja #FBEFC9 (gold-bg), radio 12px,
                                             padding 16px, "gratuito" en weight 700
```

El cierre de gratuidad va en su propia caja destacada, fuera de la cita: es una
promesa del producto, no una opinión del fundador, y tiene que leerse sin
depender de que alguien termine el testimonio.

El enlace externo lleva `target="_blank"` y `rel="noopener noreferrer"`.
Sin foto: el bloque es solo texto, así que no hay cambios de layout en móvil más
allá del ancho del contenedor existente (ya verificado sin overflow).

---

## 5. Structured data

### `src/lib/seo.ts`

Reemplaza `BRAND_FOUNDER_NAME` por un objeto único:

```ts
export const FOUNDER = {
  name: "Antony Delgado",
  url: "https://www.linkedin.com/in/adelgadox/",
  sameAs: ["https://www.linkedin.com/in/adelgadox/"],
} as const
```

`BRAND_FOUNDING_YEAR` no cambia.

### `src/lib/structured-data.ts`

- Nuevo `FOUNDER_PERSON_SCHEMA`:
  - `@type: "Person"`
  - `@id: ${SITE_URL}/#founder` — identificador estable e independiente del
    locale (evita dos entidades distintas para `/nosotros` y `/en/about`).
  - `name`, `url`, `sameAs`, `jobTitle`, `worksFor: { "@id": <org @id> }`.
- `ORGANIZATION_SCHEMA.founder` pasa de un objeto `Person` inline a una
  **referencia**: `{ "@type": "Person", "@id": FOUNDER_ID, name: FOUNDER.name }`.
  Una sola entidad en el grafo, no dos.
- El schema de Article/HowTo de las guías cambia `author: PUBLISHER` por la
  referencia al `Person`. `publisher` sigue siendo la Organization — es la
  separación que Google espera (persona escribe, marca publica).
- `/nosotros` emite el nodo `Person` completo junto a los schemas que ya emite.

**Requisito:** la Organization debe tener `@id` propio para que `worksFor` y la
referencia funcionen. Si hoy no lo tiene, se agrega en el mismo cambio.

### Verificación

`curl` del HTML renderizado de `/nosotros`, `/en/about` y una guía, extrayendo
el bloque `application/ld+json`, y validación en el Rich Results Test. Criterio:
un único nodo `Person` con `@id` estable, referenciado desde `founder` y desde
`author`, sin entidades duplicadas.

---

## 6. Bylines de las guías

`src/lib/content-dates.ts`:

```ts
export function authorByline(locale: Locale): string {
  return locale === "es" ? "Por Antony Delgado" : "By Antony Delgado"
}
```

El byline pasa a estar enlazado a `/nosotros` (`localizedPath("nosotros", locale)`).
Como las 6 guías renderizan la cadena directamente, el enlace se resuelve donde
se renderiza; si el markup se repite en las 6, se extrae a un componente
`AuthorByline` para no duplicar (archivos pequeños y enfocados).

---

## 7. Archivos afectados

| Archivo | Cambio |
|---|---|
| `frontend/src/lib/seo.ts` | `FOUNDER` reemplaza `BRAND_FOUNDER_NAME` |
| `frontend/src/lib/structured-data.ts` | `FOUNDER_PERSON_SCHEMA`, `@id` de Organization, `author` de las guías |
| `frontend/app/[lang]/nosotros/page.tsx` | copy ES/EN + markup de la sección + emisión del nodo `Person` |
| `frontend/src/lib/content-dates.ts` | `authorByline` |
| `frontend/app/[lang]/guias/*/page.tsx` (6) | byline enlazado (vía componente compartido) |

---

## 8. Definition of Done

- [ ] `/nosotros` y `/en/about` muestran la sección con bio, cita, caja de gratuidad y enlace a LinkedIn.
- [ ] El enlace externo abre en pestaña nueva con `rel="noopener noreferrer"`.
- [ ] Un solo nodo `Person` (`@id` estable) referenciado desde `founder` y `author`.
- [ ] Rich Results Test sin errores en `/nosotros` y en una guía.
- [ ] Las 6 guías firman "Por Antony Delgado" enlazado a `/nosotros`.
- [ ] `npx tsc --noEmit` limpio.
- [ ] Sin overflow horizontal a 320/360/390px en `/nosotros` (misma sonda del PR #155).
- [ ] Ninguna referencia restante a "Antony E Delgado Casanova" ni a "el equipo de Araguaney" como autor.
