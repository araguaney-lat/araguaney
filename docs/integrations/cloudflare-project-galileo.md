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
| 2026-08 | Se envía la solicitud a Project Galileo para `araguaney.lat` |
| 2026-08-10 | Cloudflare responde (coordinación del programa de impacto) pidiendo **documentación del estatus sin fines de lucro** de la organización |
| — | **Pendiente:** responder. Ver "El hueco" abajo |

Cloudflare aclara en su respuesta que nunca menciona públicamente a un sitio como
cliente del programa ni comenta su interés en él sin permiso escrito explícito.

## El hueco: no hay figura legal que documentar

Araguaney **no está constituida**. No hay asociación civil, no hay fundación, no hay
acta constitutiva. Es un proyecto de voluntariado que publica software libre. No
existe el documento que Cloudflare pide, y no tiene sentido inventar un equivalente.

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

**3. Constituir la A.C. (lento, y no bloquea).**
Es la solución definitiva y la que además desbloquea otras cosas (recibir donativos,
convenios formales). Toma semanas o meses y cuesta dinero. Se puede iniciar en
paralelo, pero la respuesta a Cloudflare no debe esperarla.

**Orden recomendado:** responder ya por el camino 1, empujar el 2 en paralelo, y
tratar el 3 como decisión de proyecto aparte, no como requisito de esta solicitud.

## Borrador de respuesta (inglés)

> Dear <nombre de quien coordina el programa>,
>
> Thank you for getting back to us, and for the clarification regarding
> confidentiality.
>
> I want to be straightforward with you: Araguaney is not a registered non-profit,
> so there is no incorporation or tax-exempt documentation I can send. It is an
> unincorporated, volunteer-run project. We are not a company, we have no revenue,
> and we are not seeking any. I would rather tell you this plainly than send you
> something that does not answer your question.
>
> What I can document is the nature of the project:
>
> - **It handles no money.** The platform does not process payments, donations of
>   money, or any financial transaction. It coordinates physical in-kind donations
>   only — medicines, food, water, hygiene items, tools — for relief shipments.
> - **It handles no beneficiary personal data.** The system tracks inventory, not
>   people.
> - **It is free software**, released under AGPL-3.0, with the entire source code
>   public: https://github.com/araguaney-lat/araguaney
> - **It follows sector standards** for donated goods: WHO Guidelines for Medicine
>   Donations, IFRC/ICRC and IOM relief item catalogues, UNSPSC and GS1.
> - **It implements anti-diversion controls** on in-kind donations, so that
>   humanitarian aid channels are not misused for trade-based money laundering.
> - Our terms of donation and platform disclaimers are drafted and pending review
>   by a lawyer practising in Mexico.
>
> The project was built in response to the June 2026 earthquakes in northern
> Venezuela, and it is currently being evaluated by registered disaster-response
> organizations in Mexico that operate collection centres. If a formal letter of
> support from one of them would help the application, I can pursue that — I would
> only approach them once I know it is useful to you, and I will not name any
> third party to you before they have agreed in writing.
>
> So my question is this: for a project with no legal registration, what evidence
> does Project Galileo accept in place of non-profit documentation? And would the
> partner-sponsorship route be more appropriate in our case than a direct
> application?
>
> Happy to provide anything else that helps you assess this.
>
> Kind regards,
> Antony

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
