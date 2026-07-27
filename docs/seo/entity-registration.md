# Registro de entidad: Wikidata y directorios

> Fase 17, tasks 6 (Wikidata) y 8 (menciones de marca / directorios).
> Este documento es operativo: todo lo que hay aquí está listo para copiar y
> pegar. Los identificadores de Wikidata fueron verificados contra su API
> (`wbgetentities`), no escritos de memoria.

## Por qué importa

Los motores de respuesta (ChatGPT, Perplexity, AI Overviews) no citan una URL:
citan una **entidad** que resolvieron previamente. `sameAs` en el schema del
sitio declara qué perfiles son "la misma cosa", pero esa declaración vale poco
si nadie más la confirma. Wikidata y los directorios son la confirmación
externa.

---

## Orden recomendado: primero directorios, después Wikidata

Wikidata acepta un ítem si cumple **al menos uno** de tres criterios. El que
aplica a Araguaney es el segundo: *"se refiere a una instancia de una entidad
claramente identificable que puede describirse usando referencias serias y
públicamente disponibles"*.

Hoy casi todas nuestras referencias son autopublicadas (el propio sitio, el
repositorio). Un ítem creado solo con esas fuentes **puede ser propuesto para
borrado** por la comunidad. No es automático, pero el riesgo es real y el
esfuerzo se pierde.

Por eso conviene invertir el orden del roadmap: **hacer la task 8 primero**.
Una entrada en el DPG Registry o en un catálogo de tecnología humanitaria es
exactamente el tipo de referencia independiente que sostiene el ítem.

---

## Task 8 — Directorios y menciones

### Prioridad 1: Digital Public Goods Registry

El encaje más fuerte, y el que produce la referencia de mayor autoridad. El
DPG Standard tiene **9 indicadores**. Autoevaluación con la evidencia que ya
existe en el repositorio:

| # | Indicador | Estado | Evidencia / qué falta |
|---|---|---|---|
| 1 | Relevancia para los ODS | ⚠️ | Encaje claro con **ODS 11.5** (reducir pérdidas por desastres) y **ODS 17** (alianzas). **Falta declararlo explícitamente** en el README o en `/nosotros` — el indicador exige que el proyecto indique a qué ODS contribuye |
| 2 | Licencia abierta | ✅ | AGPL-3.0 (`LICENSE`), aprobada por OSI |
| 3 | Propiedad clara | ✅ | Repo en la organización `araguaney-lat`; fundador identificado en `/nosotros` con perfil público |
| 4 | Independencia de plataforma | ✅ | `backend/Dockerfile`, `frontend/Dockerfile` y `docker-compose.yml`. Stack sin dependencias propietarias obligatorias: FastAPI + Postgres + Next.js. Vercel y Railway son conveniencia, no requisito |
| 5 | Documentación | ✅ | `README.md`, `CLAUDE.md` (dominio y reglas), `CONTRIBUTING.md` (setup reproducible sin servicios externos), `docs/` |
| 6 | Extracción de datos no-PII | ✅ | **Nuestro punto más fuerte**: el sistema no almacena PII de donantes ni beneficiarios por diseño. Exportes de manifiesto en PDF/Excel |
| 7 | Privacidad y leyes aplicables | ✅ | Aviso de privacidad y términos publicados; alineado con LFPDPPP (MX) por ausencia de datos personales |
| 8 | Estándares abiertos y buenas prácticas | ✅ | WHO Guidelines for Medicine Donations, catálogo IFRC/ICRC, IOM ERIC, UNSPSC, GS1 — documentados en `/nosotros` |
| 9A | Privacidad y seguridad de datos | ✅ | `SECURITY.md` con canal privado, `docs/security.md` con las capas, suite de aislamiento multi-tenant en CI, secret scanning + push protection |
| 9B | Contenido inapropiado / ilegal | ✅ | No hay contenido generado por usuarios público. La mensajería es interna entre operadores autenticados |
| 9C | Protección contra acoso | ✅ | Sin funciones sociales públicas. Mensajería con guard de participante y auditoría por acción |

**Única brecha real: el indicador 1.** Antes de postular, declarar los ODS en
el README. Propuesta de redacción:

> **Objetivos de Desarrollo Sostenible**
> Araguaney contribuye al **ODS 11.5** (reducir significativamente las pérdidas
> causadas por desastres) mejorando la trazabilidad y la eficiencia de la
> logística de ayuda humanitaria en especie, y al **ODS 17.16-17.17** (alianzas)
> al dar a centros de acopio independientes un estándar común de coordinación.

### Cómo se postula (es un PR con un archivo JSON)

La nominación al DPG Registry no es un formulario largo: es agregar un archivo
JSON al repositorio [`DPGAlliance/publicgoods-candidates`](https://github.com/DPGAlliance/publicgoods-candidates).

El archivo ya está escrito y **validado contra su `nominee-schema.json`**:
[`dpg-nominee-araguaney.json`](dpg-nominee-araguaney.json).

Pasos, todo desde el navegador:

1. Buscar "araguaney" en ese repositorio para confirmar que nadie lo nominó antes.
2. Ir a la carpeta [`nominees/`](https://github.com/DPGAlliance/publicgoods-candidates/tree/master/nominees) → botón **Add file** → **Create new file**.
3. Nombre del archivo: `araguaney.json` (debe coincidir con el campo `name` en
   kebab-case).
4. Pegar el contenido de `dpg-nominee-araguaney.json` tal cual.
5. Abajo, elegir **Create a new branch for this commit and start a pull request**
   → **Propose new file** → **Create Pull Request**.
6. Esperar el check verde de su CI (valida esquema, orden de campos y sangría de
   2 espacios). Si algo falla, el log dice la línea exacta.

Después hay revisión manual del equipo del DPG; puede tomar semanas y suelen
pedir aclaraciones por comentarios en el PR.

> **Detalle que rompe la validación**: su esquema usa el identificador SPDX
> corto `AGPL-3.0`, no el moderno `AGPL-3.0-only` que declara nuestro
> `package.json`. El archivo ya usa el que ellos aceptan.

> **Antes de postular**: el campo `contact_email` apunta a
> `security@araguaney.lat`. Si prefieres un buzón general (`hola@`, `contacto@`),
> créalo y cámbialo en el JSON.

### Prioridad 2: catálogos de tecnología humanitaria

| Directorio | Encaje | Nota |
|---|---|---|
| **ReliefWeb** (OCHA) | alto | Publica anuncios y recursos del sector. Requiere ser fuente registrada; empezar por un anuncio del lanzamiento open source |
| **Humanitarian Data Exchange (HDX)** | medio | Más orientado a datasets que a software; encaja si algún día se publica el panel agregado como dataset abierto |
| **NetHope Solutions Center** | alto | Catálogo de soluciones tecnológicas para ONGs |
| **OpenSourceAlternative.to / AlternativeTo** | medio | Encaja con la página comparativa vs Excel (task 10, ya publicada) |
| **Product Hunt** | bajo-medio | Tráfico y un backlink, pero audiencia poco alineada. Solo si hay demo grabada (task 17) |
| **Awesome Humanitarian / listas GitHub** | bajo | PRs a listas `awesome-*` del sector. Esfuerzo mínimo |

### Copy listo para formularios

**Nombre**: Araguaney

**Tagline (ES)**: El estándar común para coordinar centros de acopio y
logística de ayuda humanitaria.

**Tagline (EN)**: The common standard for coordinating aid collection centers
and humanitarian logistics.

**Descripción corta (ES, ~50 palabras)**:
> Araguaney es software libre y gratuito para centros de acopio: registra
> donaciones en especie por ítem, las empaca en cajas homogéneas con QR, las
> consolida en tarimas y envíos con manifiesto exportable para aduana, y suma
> el stock de todos los centros en un panel nacional. No almacena datos
> personales de donantes ni beneficiarios.

**Descripción corta (EN, ~50 palabras)**:
> Araguaney is free and open-source software for aid collection centers: it
> registers in-kind donations item by item, packs them into homogeneous boxes
> with QR codes, consolidates them into pallets and shipments with a
> customs-ready manifest, and aggregates every center's stock into a national
> dashboard. It stores no personal data of donors or beneficiaries.

**Enlaces**: sitio `https://www.araguaney.lat` · código
`https://github.com/araguaney-lat/araguaney` · licencia AGPL-3.0

---

## Task 6 — Ítem de Wikidata

### Identificadores verificados

Propiedades (verificadas vía `wbgetentities`):

| Propiedad | ID | Tipo |
|---|---|---|
| instance of | `P31` | item |
| copyright license | `P275` | item |
| official website | `P856` | url |
| source code repository URL | `P1324` | url |
| programmed in | `P277` | item |
| inception | `P571` | time |
| founder | `P112` | item |
| developer | `P178` | item |
| has use | `P366` | item |
| described at URL | `P973` | url |
| country | `P17` | item |

Valores (QIDs verificados):

| Concepto | QID |
|---|---|
| software | `Q7397` |
| web application | `Q189210` |
| free software | `Q341` |
| GNU AGPL v3.0 | `Q27017232` |
| GNU AGPL v3.0 or later | `Q27020062` |
| humanitarian aid | `Q826745` |
| Python | `Q28865` |
| JavaScript | `Q2005` |
| TypeScript | `Q978185` |

> Cuidado con la licencia: `Q27017232` es "version 3.0" y `Q27020062` es
> "version 3.0 or later". Nuestro `LICENSE` es el texto de AGPL-3.0 y
> `package.json` declara `AGPL-3.0-only`, así que el valor correcto es
> **`Q27017232`**.

### Payload para QuickStatements

Crear el ítem en [quickstatements](https://quickstatements.toolforge.org/)
(modo v1, una sentencia por línea). `LAST` se refiere al ítem recién creado:

```
CREATE
LAST	Len	"Araguaney"
LAST	Les	"Araguaney"
LAST	Den	"free and open-source software for coordinating humanitarian aid collection centers"
LAST	Des	"software libre para coordinar centros de acopio de ayuda humanitaria"
LAST	P31	Q7397
LAST	P31	Q189210
LAST	P31	Q341
LAST	P275	Q27017232
LAST	P856	"https://www.araguaney.lat"
LAST	P1324	"https://github.com/araguaney-lat/araguaney"
LAST	P277	Q28865
LAST	P277	Q978185
LAST	P571	+2026-00-00T00:00:00Z/9
LAST	P366	Q826745
```

Notas:

- `P571` usa precisión `/9` (año) porque solo afirmamos 2026, no una fecha
  exacta.
- `P112` (founder) requiere que exista un ítem de persona para Antony Delgado.
  **No crear uno**: la notabilidad de una persona en Wikidata es más exigente
  que la de un proyecto y sería el primer candidato a borrado. Omitir hasta
  que haya cobertura independiente sobre la persona.
- `P178` (developer) apuntaría a un ítem de la organización, que tampoco
  existe. Misma decisión: omitir.

### Después de crear el ítem

1. Anotar el QID resultante.
2. Agregarlo a `BRAND_SAME_AS` en `frontend/src/lib/seo.ts`:
   ```ts
   export const BRAND_SAME_AS: readonly string[] = [
     "https://www.linkedin.com/company/araguaney-lat",
     "https://github.com/araguaney-lat",
     "https://www.wikidata.org/wiki/Q<QID>",   // ← nuevo
   ]
   ```
   Fluye automáticamente al `Organization` schema; no hay más cambios de código.
3. Agregar como referencias del ítem (`P973` o referencias por declaración) las
   fuentes independientes que existan para entonces: entrada en el DPG Registry,
   catálogo donde esté listado.

### Riesgo a tener presente

Si el ítem se crea únicamente con fuentes autopublicadas, cualquier editor
puede abrir una solicitud de borrado y la decisión queda en la comunidad. Es
reversible (se puede recrear con mejores referencias), pero conviene no quemar
el intento: **crear el ítem cuando exista al menos una referencia
independiente**.

---

## Estado

- [ ] Declarar ODS en el README (brecha del indicador 1 del DPG)
- [ ] Postular al DPG Registry
- [ ] Anuncio de lanzamiento open source (base para ReliefWeb y otros)
- [ ] Alta en 2-3 catálogos de tecnología humanitaria
- [ ] Crear el ítem de Wikidata (después de la primera referencia independiente)
- [ ] Agregar el QID a `BRAND_SAME_AS`
