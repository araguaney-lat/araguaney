# Mantenimiento de SEO/AEO — runbook del día a día

> Tareas pequeñas y recurrentes que mantienen viva la base de SEO/AEO construida en la
> **Fase 17** (`docs/roadmap/phase-17-aeo-keyword-expansion.md`). No son features: son hábitos.
> Todo vive en `frontend/` y es un cambio de una o pocas líneas.

---

## 1. Apendar a `/novedades` al lanzar una feature

**Cuándo:** cada vez que sale algo visible para el usuario (feature nueva, mejora, fix notable).
**Por qué:** `/novedades` es una señal de frescura recurrente. Una página que no se actualiza
pierde relevancia (y citas de IA); una que se actualiza seguido se ve viva.

**Cómo:** edita `frontend/src/lib/changelog.ts` y agrega una entrada **arriba del todo**
(orden: más nueva primero). Bilingüe, con fecha ISO y un `tag`:

```ts
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: "2026-08-10",              // ISO yyyy-mm-dd (la fecha real de lanzamiento)
    tag: "new",                       // "new" | "improvement" | "fix"
    es: {
      title: "Título corto y claro",
      body: "1–2 frases en lenguaje de usuario (qué gana quien lo usa), sin jerga técnica.",
    },
    en: {
      title: "Short, clear title",
      body: "1–2 sentences in user language (what the user gains), no technical jargon.",
    },
  },
  // …entradas anteriores
]
```

- La fecha de la primera entrada se muestra sola como "Última actualización" en el hero.
- No hace falta tocar nada más: la página, el sitemap y `llms.txt` ya la referencian.

---

## 2. Bumpear `dateModified` en las guías (cada trimestre)

**Cuándo:** trimestral, o cuando de verdad refresques el contenido de una guía.
**Por qué:** las páginas no actualizadas ~cada trimestre pierden citas de IA a ~3x, y Google
muestra la fecha en resultados. Es literalmente la señal de "esto sigue vigente".

**Cómo:** edita `frontend/src/lib/content-dates.ts` y sube el campo `modified` de la(s)
guía(s) que revisaste a la fecha de hoy:

```ts
export const CONTENT_DATES: Partial<Record<RouteKey, ContentDates>> = {
  "guias/como-organizar-un-centro-de-acopio": { published: "2026-07-21", modified: "2026-10-15" },
  //                                                                       ^^^^^^^^^^^^^^^^^^^^^^ súbelo
  // …
}
```

- **Regla de honestidad:** sube `modified` solo si realmente revisaste/actualizaste el contenido.
  Cambiar la fecha sin tocar nada es "fecha falsa" y a la larga penaliza.
- El cambio se refleja solo en el JSON-LD (`Article`/`HowTo`) y en el texto "Actualizado" visible.
- Al crear una guía nueva, agrega su entrada aquí (`published` y `modified` = fecha de creación).

---

## 3. Agregar perfiles a `sameAs` (cuando existan) + Wikidata

**Cuándo:** al crear una red social oficial nueva (X, Instagram, Facebook, YouTube, Crunchbase)
o la entidad en Wikidata.
**Por qué:** `sameAs` ancla la marca en el knowledge graph. Las menciones/entidad correlacionan
más con citas de IA que los backlinks. Cada ancla nueva suma.

**Cómo:** edita `frontend/src/lib/seo.ts` y agrega **una línea** por URL en `BRAND_SAME_AS`:

```ts
export const BRAND_SAME_AS: readonly string[] = [
  "https://www.linkedin.com/company/araguaney-lat",
  "https://github.com/araguaney-lat",
  "https://www.instagram.com/araguaney.lat",     // ← ejemplo: perfil nuevo
  "https://www.wikidata.org/wiki/Q123456789",    // ← el QID de Wikidata cuando exista (task 6)
]
```

- Solo se emite si el array no está vacío; entra automáticamente al `Organization` schema (home
  y `/nosotros`). No hay que tocar nada más.
- **Wikidata (task 6, pendiente):** al crear la entidad, su URL `https://www.wikidata.org/wiki/Q…`
  va aquí. Pasos de creación en el spec/roadmap de la Fase 17.

---

## Renovación anual del DPG (una vez al año)

> Postulación enviada el **2026-07-27**. Si se aprueba, la renovación se cuenta
> desde la fecha de aprobación que confirme la DPG Alliance.

Si Araguaney entra al [DPG Registry](https://digitalpublicgoods.net/registry),
el reconocimiento **vale un año**. La DPG Alliance envía una renovación anual y
hay que confirmar que la solución sigue cumpliendo el DPG Standard. Si no se
responde, o si se dejó de cumplir algún indicador, la entrada pasa a estado
**Expired** y se pierde el listado (y con él la referencia externa que sostiene
el ítem de Wikidata).

Qué revisar antes de confirmar la renovación:

- La licencia sigue siendo AGPL-3.0 y el repositorio sigue público.
- `SECURITY.md`, `CODE_OF_CONDUCT.md` y `CONTRIBUTING.md` siguen vigentes y con
  contactos que funcionan.
- Sigue sin registrarse PII de donantes ni beneficiarios (es el indicador donde
  el proyecto es más fuerte, y el más fácil de romper sin darse cuenta al
  agregar features).
- Los exportes no-PII siguen disponibles (manifiesto XLSX, CSV de reportes, API).
- Aviso de privacidad y Términos siguen publicados y actualizados.

Las respuestas por indicador, con enlaces, están en
[`seo/entity-registration.md`](seo/entity-registration.md) — sirven de base para
la renovación, no solo para la postulación inicial.

---

## Recordatorios de infraestructura (una sola vez, ya configurados)

Estos ya están hechos; anótalos por si migras de entorno o alguien pregunta:

- **Host canónico:** `www.araguaney.lat`. `NEXT_PUBLIC_SITE_URL=https://www.araguaney.lat` en
  Vercel; el apex hace 301 a www.
- **IndexNow:** `INDEXNOW_KEY` seteada en Railway = valor del key file
  `frontend/public/9c4a1e7b6f0d42a8b3e5c8d1f2a06b7e.txt`. Al crear una campaña pública, el backend
  pinguea IndexNow solo. Si cambias el key, cambia ambos (env + archivo).
- **Search Console (Google) y Bing Webmaster:** dominio verificado + sitemap enviado en ambos.

---

## Proceso mensual de medición (Fase 17, tasks 19–21 — pendientes)

Cuando lo arranquemos, la rutina es:

1. **Citas en IA (task 19):** correr un set fijo de prompts (head terms + comparativas, ES/EN) en
   ChatGPT / Perplexity / Gemini / Google AI Overviews y registrar si Araguaney aparece citado y
   con qué página. Una fila por mes en una hoja.
2. **Bing (task 20):** revisar cobertura e impresiones en Bing Webmaster Tools (complementa GSC).
3. **KPIs de AEO (task 21):** más allá de la posición en Google — share-of-voice en respuestas de
   IA, menciones de marca y citas.

---

## Regla de oro

La base de SEO/AEO no se "termina": se **mantiene**. Tres hábitos bastan —
**(1)** apendar novedades al lanzar, **(2)** refrescar fechas cada trimestre, **(3)** sumar anclas
de entidad cuando existan. Todo lo demás (rutas, schema, sitemap, llms.txt) ya se actualiza solo.
