# Project Galileo (Cloudflare) — solicitud y seguimiento

> Bitácora viva de la postulación de `araguaney.lat` a Project Galileo.
> Se actualiza cada vez que hay un movimiento con Cloudflare.

## Qué es y por qué lo queremos

Project Galileo es el programa de Cloudflare que da protección de nivel Enterprise
**sin costo** a organizaciones de interés público vulnerables a ciberataques: derechos
humanos, sociedad civil, periodismo, respuesta a desastres. Cubre WAF avanzado,
rate limiting y mitigación de DDoS sin medir ni facturar el tráfico mitigado.

Araguaney lo necesita por una razón concreta: la plataforma tiene superficie pública
sin sesión (ficha de QR, panel "qué falta", pre-registro de donaciones) y corre sobre
planes gratuitos. Un ataque volumétrico no solo la tira, agota el presupuesto de una
operación humanitaria — el riesgo real aquí es EDoS, no solo DDoS.

**Decisión de costos asociada** (sigue vigente):

1. Galileo primero. Si entra, la protección de pago cuesta cero.
2. Si hay que pagar algo, el primer plan es **Vercel Pro** (rate limiting en `/api/*`
   y spend caps), no Cloudflare Pro.
3. **Cloudflare Pro no es prioridad.** Lo que más protege del lado de Cloudflare —la
   mitigación de DDoS— ya viene en el plan gratuito, y Pro no desbloquea el rate
   limiting que querríamos.

Mientras tanto, todo sigue en gratuito: alertas de uso en Vercel, regla `log` para
sondeos de exploits, Turnstile en formularios públicos.

## Estado

| Fecha | Movimiento |
|---|---|
| 2026-07-27 | Se envía la nominación de Araguaney a la Digital Public Goods Alliance. Estado: en revisión |
| 2026-08 | Se envía la solicitud a Project Galileo para `araguaney.lat` |
| 2026-08-10 | Cloudflare responde (coordinación del programa de impacto) pidiendo **documentación del estatus sin fines de lucro** de la organización |
| — | **Pendiente:** responder. Ver "El hueco" abajo |

Cloudflare aclara en su respuesta que nunca menciona públicamente a un sitio como
cliente del programa ni comenta su interés en él sin permiso escrito explícito.

## El hueco: no hay figura legal que documentar

Araguaney **no está constituida**. No hay asociación civil, no hay fundación, no hay
acta constitutiva. Es un proyecto de voluntariado que publica software libre. No
existe el documento que Cloudflare pide, y no tiene sentido inventar un equivalente.

**Y no es un trámite pendiente: es la forma del proyecto.** No hay intención de crear
una fundación. Quien lo mantiene aporta lo que sabe hacer —construir, corregir y
mejorar el software— y lo entrega gratis a cualquier centro que lo necesite. La
operación humanitaria la hacen las organizaciones que usan la plataforma; el proyecto
pone la herramienta. Decirlo así ante Cloudflare es más limpio que insinuar una
constitución que nunca va a llegar.

Lo que sí es cierto y sí se puede evidenciar:

- **No hay actividad comercial.** La plataforma no cobra, no procesa pagos y no
  gestiona donativos económicos (`CLAUDE.md`, sección 2: NO-objetivos).
- **No hay PII de personas beneficiarias.** Solo inventario humanitario.
- **Es software libre**, AGPL-3.0, con el código completo en público:
  <https://github.com/araguaney-lat/araguaney>.
- **Sigue estándares del sector**: WHO (donación de medicamentos), IFRC/ICRC, IOM,
  UNSPSC, GS1.
- **Incorpora controles antidesvío** de la donación en especie (fase 20), lo que
  refuerza el perfil de interés público y, de paso, explica por qué podría ser blanco.
- **Documentación legal en preparación**: términos de donación en especie, política
  de aceptación y exención de plataforma, en `docs/legal/drafts/`, pendientes de
  revisión profesional.
- **Nominación ante la Digital Public Goods Alliance**, la iniciativa cofundada por
  UNICEF y el gobierno de Noruega. Es la evidencia sustituta más fuerte que hay hoy,
  porque es un tercero el que evalúa —contra los nueve indicadores del DPG Standard:
  licencia abierta, propiedad clara, independencia de plataforma, documentación y
  *do-no-harm* con privacidad y protección de datos— y no el proyecto hablando de sí
  mismo. El flujo es **nominación → revisión técnica → reconocimiento y alta en el
  registro público**: mientras no concluya la revisión, se dice "sometido a revisión",
  nunca "es un DPG". Sobrevender ese estado ante Cloudflare costaría más que el
  beneficio de mencionarlo.

> **Los identificadores de esa solicitud no se escriben aquí.** El registro público
> solo lista proyectos con revisión concluida, así que hoy el número no se puede
> resolver desde fuera: no le sirve a quien lea este repositorio y sí es un
> identificador de una solicitud en curso. Ante Cloudflare se ofrece bajo pedido, para
> que confirmen con la Alianza directamente. La fecha y el estado sí van arriba,
> porque son lo que hace verificable la afirmación.

Galileo no publica un requisito rígido de registro legal: la elegibilidad se evalúa
por misión y vulnerabilidad, y una de las vías de entrada es que una **organización
socia** del programa patrocine al solicitante. Eso deja tres caminos, no uno.

## Caminos para avanzar

**1. Declararlo tal cual y ofrecer evidencia sustituta (inmediato).**
Responder con la verdad —no hay registro— y poner sobre la mesa el paquete de
evidencia de arriba, preguntando qué acepta el programa cuando no hay figura legal.
Es lo honesto y lo que no quema la solicitud: mentir sobre estatus legal a un
proveedor de infraestructura es exactamente el tipo de cosa que la descalifica.

**2. Respaldo de una organización registrada que use la plataforma (el más fuerte).**
Una carta de una organización humanitaria ya constituida que opere con Araguaney
resuelve el problema de raíz: la evaluación deja de colgar de una figura legal
inexistente y pasa a colgar de una operación real. Hoy hay conversaciones abiertas
con organizaciones de rescate en México, todavía en revisión del producto. **No se
menciona ninguna por nombre ante Cloudflare hasta que acepten por escrito**: nombrar
a un tercero como respaldo antes de que lo sea es un problema propio.

**3. Constituir una A.C. — descartado.**
Sería la vía que resuelve el papel, pero implica convertir el proyecto en una
organización con órganos de gobierno, contabilidad y obligaciones fiscales, y eso no
es lo que se está construyendo. La aportación es técnica: software libre, mantenido y
mejorado, disponible sin costo. Queda registrado como decisión, no como pendiente,
para que nadie lo reabra cada vez que un formulario pida un acta constitutiva.

**Orden recomendado:** responder ya por el camino 1 y empujar el 2 en paralelo.

## Borrador de respuesta (inglés)

> Dear <nombre de quien coordina el programa>,
>
> Thank you for your reply, and for the clarification regarding confidentiality.
>
> I want to answer your question plainly rather than send you something that does not
> address it: Araguaney is **not a registered non-profit, and it is not on its way to
> becoming one**. There is no incorporation certificate or tax-exempt determination I
> can provide, because no legal entity exists.
>
> That is not an administrative gap. It is what the project is. Araguaney is software
> I build and maintain personally, and give away at no cost to any collection centre
> that needs it. Software engineering is what I know how to do, and this is how I
> contribute to humanitarian relief: I write the code, fix it, improve it and keep it
> running. The humanitarian operation itself is carried out by the organizations that
> use the platform. I do not run a charity, I do not raise funds, and I have no
> intention of forming a foundation in order to keep doing this.
>
> What I can evidence is the nature of the project:
>
> - **The source code is publicly released** under the AGPL-3.0 licence — free
>   software in the strict sense, auditable and reusable by anyone:
>   https://github.com/araguaney-lat/araguaney
> - **It is provided free of charge.** There is no licence fee, no paid tier, no
>   revenue of any kind, and none is planned.
> - **It handles no money.** The platform does not process payments or monetary
>   donations. It coordinates physical in-kind donations only — medicines, food,
>   water, hygiene supplies, tools — for relief shipments.
> - **It handles no beneficiary personal data.** The system tracks humanitarian
>   inventory, not people.
> - **It follows sector standards** for donated goods: WHO Guidelines for Medicine
>   Donations, the IFRC/ICRC and IOM relief item catalogues, UNSPSC and GS1.
> - **It implements anti-diversion controls** on in-kind donations, so that
>   humanitarian aid channels are not misused for trade-based money laundering.
> - **Legal documentation is drafted and pending professional review.** The terms
>   governing in-kind donations, the donation acceptance policy and the platform
>   disclaimer are written and awaiting review by a lawyer practising in Mexico
>   before they are published.
>
> I have also submitted the project to the **Digital Public Goods Alliance** — the
> multi-stakeholder initiative co-founded by UNICEF and the Government of Norway — for
> assessment against the DPG Standard. The nomination was submitted on 27 July 2026
> and is currently under review; it is not yet listed publicly, since the DPG registry
> lists only projects that have completed review. I am happy to share our DPG
> application reference so that you can confirm the submission with the Alliance
> directly. I mention it because that review examines much of what your question is
> aimed at: open
> licensing, clear ownership, platform independence, documentation, and do-no-harm
> requirements covering privacy and data protection. It is an independent assessment
> of the project's public-interest character, rather than a claim I am making about
> myself.
>
> The project was built in response to the June 2026 earthquakes in northern
> Venezuela, and it is currently being evaluated by registered disaster-response
> organizations in Mexico that operate collection centres. If a letter of support
> from one of them would help the application, I am glad to pursue it — I will
> approach them only once I know it is useful to you, and I will not name any third
> party before they have agreed in writing.
>
> So my question is this: where an applicant has no legal registration by design,
> what evidence does Project Galileo accept in place of non-profit documentation?
> And in our case, would the partner-sponsorship route be more appropriate than a
> direct application?
>
> I am happy to provide anything else that helps you assess this.
>
> Kind regards,
> Antony Delgado

## Textos de la solicitud original

Se conservan para reusarlos si hay que volver a describir el proyecto ante Cloudflare
o ante una organización socia.

### Misión (inglés)

> Araguaney is a non-commercial, volunteer-run humanitarian platform that coordinates
> in-kind donation collection centers responding to the June 2026 earthquakes in
> northern Venezuela. It standardizes how dozens of independent collection centers
> register physical donations, pack them into QR-labeled homogeneous boxes,
> consolidate them into pallets and shipments with exportable manifests, and provides
> a national aggregated view of available relief stock. It handles no money and no
> beneficiary personal data — only humanitarian inventory. The platform is open source
> and follows WHO, IFRC/ICRC and IOM standards for donated goods, and includes
> controls to prevent the misuse of in-kind aid channels.

### Por qué necesita protección (inglés)

> Araguaney is the operational backbone that collection centers use to prepare and
> track physical humanitarian shipments, so any downtime directly delays disaster
> relief on the ground. It is a public-facing platform (public QR item pages, a
> "what's needed" panel, and online donation pre-registration) accessible without
> login, which makes it an easy target for volumetric and application-layer attacks.
> It is run by a small volunteer team on free-tier infrastructure with no budget to
> absorb a DDoS or economic-denial (EDoS) attack. The platform also enforces
> anti-diversion controls on in-kind donations, which could make it a target for
> actors seeking to misuse humanitarian aid channels.

### Datos de apoyo

- **Sitio:** <https://araguaney.lat>
- **Países:** centros de acopio en México; envíos a Venezuela.
- **Comercial:** no. Sin fines de lucro de hecho, sin figura legal constituida.
- **Equipo:** voluntariado, pequeño.
- **Protección actual:** Cloudflare gratuito + Vercel gratuito + rate limiting en la
  aplicación.
- **Historial de ataques:** responder siempre con la verdad. Galileo no exige haber
  sido atacado; basta el riesgo y el perfil de interés público. No se inventan
  incidentes.
