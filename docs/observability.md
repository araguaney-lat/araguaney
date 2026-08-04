# Observabilidad: qué se vigila y qué no

> **La política.** Todo trabajo de fondo que sostenga una promesa avisa cuando
> falla. Si algo que prometimos deja de cumplirse, alguien tiene que enterarse
> sin ir a buscarlo.

Este documento dice qué dispara una alerta, a qué canal llega, qué se espera de
quien la recibe, y **qué no está cubierto**. Lo último importa tanto como lo
primero: un hueco documentado se puede planear, uno implícito no.

---

## El problema que resuelve

Un error se nota: alguien lo ve, algo revienta, hay traza. Una ausencia no. Un
cron que nunca se ejecuta no lanza ninguna excepción, así que ningún sistema de
alertas basado en errores se entera. Si el worker deja de arrancar tras un
deploy, todo queda en silencio mientras los plazos de conservación declarados en
el aviso de privacidad se acumulan sin cumplirse.

Por eso hay dos familias de señal: **algo falló** y **algo dejó de ocurrir**.

---

## Qué dispara una alerta

| Señal | Qué la dispara | A dónde llega | Qué se espera de quien la recibe |
|---|---|---|---|
| `Backend 500` | Cualquier excepción no manejada de la API | Slack (canal de alertas) con contexto de estado de Railway y Vercel, más Sentry | Descartar primero que sea una caída de infraestructura ajena: el contexto viene justo para eso |
| `Tarea de fondo fallida` | Una tarea de ARQ agotó sus tres intentos | Slack | Ese trabajo **quedó sin hacerse**. Decidir si se reencola o se repara |
| `La purga no corrió` | Un cron de purga falló | Slack, diciendo qué promesa queda incumplida | Los plazos del aviso de privacidad dependen de esa purga. No es un error técnico cualquiera |
| `Hay trabajo de fondo que dejó de correr` | El vigilante horario detecta un cron rezagado | Slack, con la lista y su consecuencia | Revisar si el worker está vivo. Suele ser un deploy que no levantó |
| `/health/jobs` responde 503 | Hay al menos un cron rezagado, preguntado desde fuera | El servicio de uptime externo | Igual que el anterior, pero es la señal que sobrevive a la muerte del worker |
| `Rebotes de correo por encima de lo normal` | Los rebotes sin resolver superan el total de la ventana, o se concentran en un dominio | Slack, nombrando dominios y nunca direcciones | Revisar reputación, SPF/DKIM y el panel de Resend. El pre-registro de donaciones depende de que el correo llegue |
| Excepción del worker | Cualquier fallo en el proceso del worker | Sentry | Diagnóstico. El worker corre aparte y sus trazas no aparecerían en ningún lado |
| Error del frontend | Excepción en cliente, servidor o edge de Next | Sentry | Diagnóstico |

### Dos decisiones de diseño que explican el ruido que no ves

**Se alerta al rendirse, no al fallar.** ARQ reintenta tres veces. Avisar en cada
intento triplicaría el ruido de un timeout de red o un deploy a medias que se
arregla solo en el segundo intento. Lo que merece una alerta es lo que quedó sin
hacerse.

**Un cron que falla no se reintenta.** Reintentar una purga podría ejecutarla dos
veces, y algunas no son idempotentes en su efecto sobre el almacenamiento. La
alerta sale y el cron sigue: propagar la excepción dejaría el fallo sin
destinatario, porque nadie está mirando a las cinco de la mañana.

**La alerta dice qué se rompió, no qué excepción salió.** `TimeoutError en
purge_donations_cron` le sirve a quien escribió el cron. A quien la lee de
madrugada le sirve "los pre-registros sin confirmar dejan de vencerse, y el aviso
de privacidad declara un plazo para eso".

---

## El latido de los crons

Cada cron anota su última corrida exitosa en `cron_runs`, y **solo si terminó
bien**: un cron que falló no corrió, por más que se haya ejecutado.

Un vigilante horario revisa que ninguno se haya quedado atrás. Cada cron tiene su
propia ventana de tolerancia, con holgura sobre su periodo real (medir con la
misma vara uno horario y uno diario daría una alerta falsa o taparía una real).
Las ventanas viven en `app/services/cron_heartbeat.py` y no en el entorno a
propósito: son propiedad del calendario de cada cron, no configuración de quien
opera. Si alguien mueve la hora de una purga, mueve esa tabla en el mismo commit.

Dos detalles que evitan alertas inútiles:

- Un despliegue recién hecho no alerta. La fila distingue "acaba de nacer" de
  "lleva su ventana entera sin correr ni una vez". Sin eso, cada deploy
  entrenaría a quien recibe las alertas a ignorarlas.
- La fila de un cron que ya no existe se ignora, para que no alerte para siempre.

### Por qué además hay un endpoint público

**Un vigilante no puede detectar su propia muerte.** El vigilante es un cron: si
el worker entero deja de arrancar, muere con los demás y no avisa nada.

`GET /health/jobs` permite hacer la pregunta desde fuera del proceso que podría
estar muerto. Responde **503** cuando algo se quedó atrás, porque un servicio de
uptime gratuito solo entiende códigos de estado; un 200 con un cuerpo triste no
lo notaría nadie.

Es público y sin sesión, así que dice **que** algo va atrasado y no **qué** cron,
desde cuándo ni cada cuánto corre. Hay test que lo fija.

---

## Canales y configuración

| Variable | Para qué | Si falta |
|---|---|---|
| `SLACK_BOT_TOKEN` | Autenticar al bot que publica | No sale ninguna alerta a Slack |
| `SLACK_ALERT_CHANNEL` | Canal destino | No sale ninguna alerta a Slack |
| `SENTRY_DSN` | Errores de API y worker | El SDK ni siquiera se inicializa |
| `SENTRY_ENVIRONMENT` | Separar producción de lo demás | Todo cae en el mismo cubo |
| `NEXT_PUBLIC_SENTRY_DSN` | Errores del frontend | El frontend no reporta |
| `BOUNCE_ALERT_WINDOW_HOURS` | Ventana de medición de rebotes | Se usan 24 h |
| `BOUNCE_ALERT_TOTAL` | Rebotes en la ventana que disparan aviso | Se usa el valor por defecto |
| `BOUNCE_ALERT_PER_DOMAIN` | Rebotes de un solo dominio que disparan aviso | Se usa el valor por defecto |

Sentry y Slack operan en plan gratuito.

**El riesgo silencioso vive aquí.** Toda la observabilidad es opcional por
diseño: su ausencia nunca rompe una petición de usuario, y `notify_slack` jamás
levanta una excepción. La consecuencia es que un canal mal configurado se ve
exactamente igual que un sistema sano. Sin `SENTRY_DSN`, `sentry_sdk.init` ni se
llama y todo parece bien.

Por eso el bot tiene que estar **invitado al canal** (`/invite @Bot`) y por eso
verificar la cadena de punta a punta es una tarea propia, no un supuesto.

---

## Qué NO está cubierto

Huecos conocidos, a la fecha de este documento:

1. **Sentry sin verificar de punta a punta.** El SDK se inicializa, que no es lo
   mismo que un error llegando al dashboard (ver el runbook). Vale la pena
   insistir en esto: el SDK del navegador estuvo **sin cargarse** por un archivo
   con el nombre de una versión anterior, y nada en el panel lo delataba.
2. **Source maps por confirmar.** El token está puesto, pero la organización
   estaba mal escrita en `next.config.ts` y la subida llevaba desde el 6 de julio
   sin completarse, con el build siempre en verde. Corregido; queda comprobar en
   el próximo deploy que vuelven a llegar paquetes nuevos.
3. **Slack caído se traga la alerta.** Es deliberado: la observabilidad no puede
   tumbar una petición. Pero significa que hay un modo de fallo en el que el
   error ocurre y el aviso no llega. Sentry cubre parte de ese hueco.
4. **Sin señales de rendimiento ni de saturación.** No hay alerta de latencia, de
   agotamiento del pool de conexiones ni de crecimiento de la base.
5. **Sin alertas de gasto.** Los topes y avisos de presupuesto requieren plan de
   pago de la infraestructura.
6. **La llave pública de Sentry no está blindada** todavía.

---

## El presupuesto de ruido

Una alerta vale por lo que provoca, y un canal donde el mismo mensaje aparece
cuarenta veces seguidas no provoca nada: entrena a quien lo lee a ignorarlo.

Por eso la primera aparición de un problema sale completa y las repeticiones
dentro de su ventana se callan. Lo que se agrupa es la **identidad del
problema**, no el texto ni la severidad:

| Señal | Qué la identifica |
|---|---|
| 500 del backend | ruta + tipo de excepción |
| Tarea de fondo fallida | nombre de la tarea + tipo de excepción |
| Purga que falla | nombre del cron + tipo de excepción |
| Crons rezagados | la lista de crons rezagados |
| Rebotes en volumen | la ventana de medición |

Un problema distinto siempre suena. Y el agrupador **falla abierto**: sin Redis
no hay dónde recordar qué se mandó, así que se manda todo. Entre un canal ruidoso
y un canal mudo, el ruidoso es el que se puede arreglar leyéndolo.

---

## Por qué los eventos del navegador salen por nuestro dominio

Los bloqueadores de anuncios y las extensiones de privacidad filtran el dominio
de ingesta de Sentry por defecto. Sin hacer nada al respecto, el SDK intenta
enviar, la petición se corta y el error se pierde.

Y no se pierde al azar. Desaparece exactamente el segmento de gente que navega
con bloqueador, así que el panel queda con una foto **sesgada que parece
completa**: es el mismo fallo silencioso que ataca toda esta fase, pero disfrazado
de calma.

Por eso `tunnelRoute: "/monitoring"` en `next.config.ts`. El navegador envía a
una ruta de este dominio y Next la reescribe hacia Sentry desde el servidor.
Ninguna lista de bloqueo filtra el dominio propio.

Dos precisiones para no confiarse:

- **El DSN sigue estando en el bundle del cliente.** El SDK lo necesita para
  construir el sobre; el túnel cambia el destino, no esconde la llave. Blindarla
  sigue siendo tarea aparte.
- **El tráfico pasa por funciones de Vercel.** Son unos pocos KB por evento, pero
  ya no es gratis del todo.

Cómo comprobar que el túnel está vivo: en el navegador, las peticiones de Sentry
deben ir a `/monitoring?o=…&p=…&r=…` sobre el propio dominio, no a
`ingest.sentry.io`.

---

## Runbook: dar de alta el uptime externo

**Hecho.** Queda escrito para cuando haya que rehacerlo o replicarlo.

Sin esto, una caída total de Railway no produce ninguna alerta, porque el que
tendría que avisar se cayó con todo lo demás.

1. Elegir un servicio gratuito de uptime que soporte comprobar por código de
   estado (UptimeRobot, Better Stack y Hetrix tienen plan gratuito suficiente).
2. Crear un monitor **HTTP(s)** contra `https://<API>/health/jobs`.
3. Intervalo de 5 minutos. Más seguido no aporta: la ventana de tolerancia más
   corta que vigila ese endpoint es de horas.
4. Condición de alerta: **cualquier código distinto de 200**. El endpoint
   responde 503 cuando hay trabajo de fondo rezagado, justamente para que un
   servicio que solo entiende códigos pueda notarlo.
5. Notificación al mismo canal que el resto de las alertas, para que quien esté
   de guardia mire un solo lugar.
6. Verificar que el monitor está vivo: pausarlo y reanudarlo debe producir una
   notificación de recuperación.

Dos trampas que este montaje ya se encontró, por si hay que repetirlo:

- **El método importa.** UptimeRobot comprueba con `HEAD` en su plan gratuito y
  no deja elegir. Hubo que permitir `HEAD` en la regla de métodos de Cloudflare
  (`TRACE` y compañía siguen bloqueados) y registrar la ruta para `GET` y `HEAD`,
  porque esta versión de FastAPI no agrega `HEAD` sola al declarar `GET`.
- **De dónde viene el error se lee en las cabeceras.** Un 403 con
  `content-type: text/html` y sin cabeceras del backend es Cloudflare; un 405 con
  `allow: GET` es el origen. Distinguirlos ahorra buscar en el lado equivocado.

Qué esperar en operación normal: `200` y un cuerpo que dice que no hay nada
rezagado. El endpoint es público y no revela qué cron va atrasado, así que no hay
nada sensible en exponerlo a un tercero.

Está limitado a 30 consultas por minuto y por IP, holgado para un monitor cada
cinco minutos y suficiente para que nadie lo use como grifo contra la base.

---

## Runbook: verificar Sentry de punta a punta

Cierra el hueco número dos. El SDK inicializado no prueba nada: sin DSN,
`sentry_sdk.init` ni se llama y todo parece sano.

**Backend (Railway)**

1. Confirmar que `SENTRY_DSN` y `SENTRY_ENVIRONMENT` están puestos en el servicio
   de la API **y** en el del worker. Son dos procesos distintos y cada uno lee su
   propio entorno.

   Cómo saber si falta, sin entrar al panel de Railway: con
   `traces_sample_rate=0.1` el backend manda transacciones aunque no haya ningún
   error. Si el proyecto lleva días sin recibir **nada**, el DSN no está puesto.
   Se consulta con `sentry api "/api/0/projects/<org>/<proyecto>/stats/?stat=received&resolution=1d"`.
2. Provocar un error real y comprobar que aparece en el dashboard con el
   `environment` correcto.
3. Comprobar que ese mismo error llegó a Slack. Si llega a Sentry y no a Slack,
   el problema es el canal o la invitación del bot, no la instrumentación.

**Frontend (Vercel)**

4. Confirmar `NEXT_PUBLIC_SENTRY_DSN` en el proyecto, para producción y para
   preview, y `SENTRY_AUTH_TOKEN` para que el build suba source maps.
5. Provocar un error en una página y comprobar que llega **con la línea de código
   correcta**, no una traza minificada.
6. Comprobar que el error de un preview cae en su propio entorno y no en
   `production`. El nombre sale de `SENTRY_ENVIRONMENT` si existe y si no de
   `VERCEL_ENV`, porque `NODE_ENV` vale `production` también al construir un
   preview. **Del lado del navegador solo llegan las variables con prefijo
   `NEXT_PUBLIC_`**, así que Vercel necesita tener activado "Automatically expose
   System Environment Variables" o `NEXT_PUBLIC_VERCEL_ENV` definida a mano; sin
   eso el cliente cae a `NODE_ENV` en silencio.

**Cierre**

7. Anotar en este documento la fecha de la última verificación. Una verificación
   sin fecha no distingue "se probó y funciona" de "se probó hace dos años".

> Última verificación de punta a punta: _pendiente_.

---

## Cómo agregar una alerta sin romper la política

Las alertas de tareas de fondo se aplican **en el punto de registro**, no en cada
definición: envolver se hace una sola vez, de modo que agregar una tarea nueva
sin alerta es difícil por accidente. Hay un test que recorre
`WorkerSettings.functions` y falla si alguna quedó fuera.

Otro test fija que envolver **no cambia el nombre** de la tarea: ARQ resuelve por
nombre, y renombrarla dejaría a cada `enqueue` existente sin encontrar su tarea.

Si agregas un cron nuevo:

1. Decóralo con `alert_on_cron_failure`.
2. Si sostiene una promesa (un plazo, una purga declarada), agrégale su texto en
   `_CRON_PROMISES`: es lo que se leerá de madrugada.
3. Agrega su ventana en `CRON_MAX_AGE`, con holgura sobre su periodo real.
4. Actualiza la tabla de este documento.

Si agregas una alerta nueva, pásale un `budget_key` que identifique el
**problema** y no el mensaje. Una alerta sin clave siempre suena, que es el
comportamiento correcto para lo excepcional y el equivocado para lo que puede
repetirse en ráfaga.
