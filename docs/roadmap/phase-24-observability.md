# Fase 24 — Observabilidad: que un fallo silencioso deje de serlo

> La plataforma ya avisa cuando un request revienta: el handler de 500 manda a
> Slack el error enriquecido con el estado de Railway y Vercel, y Sentry recibe
> la traza. Lo que **no** avisa es cuando falla algo que nadie está mirando —
> y ahí es donde está el riesgo real, porque el trabajo de fondo corre de noche
> y sin nadie enfrente.
>
> **El hueco que abre esta fase.** Hay cinco crons corriendo cada madrugada y
> ninguno avisa si muere. Cuatro sostienen **plazos de conservación publicados
> en el aviso de privacidad**: si `purge_donations_cron` falla treinta noches
> seguidas, nadie se entera, y mientras tanto el aviso le sigue prometiendo a
> las personas donantes que lo no confirmado se borra en siete días. Un control
> que falla en silencio es peor que no tenerlo, porque además da confianza.
>
> **Base:** el patrón ya probado en el repositorio hermano (bioflow), donde un
> decorador alerta solo en el último reintento para no inundar el canal.
>
> **Qué es público y qué no.** El repositorio es público; el espacio donde
> aterrizan las alertas, no. Credenciales y destinos —token, canal, DSN— viven
> en el entorno. Lo que sí se publica es el mecanismo: qué se vigila, cuándo
> dispara y qué se espera que haga quien reciba la alerta.
> **Costo:** cero. Sentry y Slack en sus planes gratuitos; nada nuevo que pagar.

---

## Objetivos

1. Que ningún trabajo de fondo muera sin avisar, especialmente los que sostienen
   una promesa publicada.
2. Saber si algo dejó de correr, no solo si algo falló: un cron que nunca se
   ejecuta no produce errores.
3. Mantener el ruido bajo. Una alerta que se ignora es una alerta que no existe.
4. Dejar por escrito qué se vigila y qué no, para no confundir "no hay alertas"
   con "todo bien".

## No-objetivos

- Métricas de negocio o dashboards de producto: eso vive en Reportes y en el
  Panel Nacional, no en observabilidad.
- APM, trazas distribuidas o perfilado: desproporcionado para el tamaño real.
- Cualquier servicio de pago. Si la única forma de cubrir algo es pagando,
  se documenta como límite conocido en vez de comprarlo.

---

## Lo que YA existe (y no hay que rehacer)

| Pieza | Dónde | Estado |
|---|---|---|
| Sentry backend | `main.py` inicializa el SDK con integraciones de FastAPI y SQLAlchemy | ✅ |
| Sentry frontend | `sentry.{client,server,edge}.config.ts` | ✅ |
| Alerta de 500 a Slack | `_alert_500` en `main.py`; el canal vive en `SLACK_ALERT_CHANNEL` | ✅ |
| Enriquecimiento con estado de infra | `utils/infra_status.py` consulta Railway y Vercel, cacheado 60 s | ✅ |
| Tarea `notify_slack` en ARQ | `worker.py` | ✅ |
| Healthcheck | `GET /health`, exento del modo Cloudflare-only | ✅ |

---

## Tareas

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Alerta cuando un job agota sus reintentos | `alert_on_final_failure` avisa a Slack solo en el último intento (`job_try >= MAX_TRIES`) y **vuelve a levantar**: la alerta observa, no interfiere con el reintento de ARQ. Se aplica en el punto de registro y no en cada definición, así que agregar una tarea nueva sin alerta es difícil — y hay test que recorre `WorkerSettings.functions` y falla si alguna quedó fuera. Otro test fija que envolver no cambia el nombre, porque ARQ resuelve por nombre y cada `enqueue` existente dejaría de encontrar su tarea. | 🔴 Alta | ✅ Done |
| 2 | Alerta de cron de purga con contexto de retención | Los cinco crons avisan al fallar diciendo **qué queda incumplido**: "los pre-registros sin confirmar dejan de vencerse y el aviso de privacidad declara un plazo para eso", en vez de un `TimeoutError`. El cron no propaga: reintentar una purga podría ejecutarla dos veces, y propagar dejaría el fallo sin destinatario a las cinco de la mañana. | 🟠 Media | ✅ Done |
| 3 | Latido de los crons | Tabla `cron_runs` (migración `040`, una fila por cron sembrada vacía) y decorador que anota la corrida **solo si terminó bien**. Vigilante horario que alerta de lo rezagado, con ventana propia por cron. `created_at` distingue "recién desplegado" de "lleva su ventana entera sin correr ni una vez", así que no alarma en un deploy nuevo pero sí atrapa al worker que dejó de arrancar. **Un vigilante no puede detectar su propia muerte**, así que además está `GET /health/jobs`: responde 503 cuando algo se quedó atrás, para que un servicio de uptime lo note desde fuera del proceso que podría estar muerto. Público y sin sesión, así que dice *que* algo va atrasado y no *qué*. | 🟠 Media | ✅ Done |
| 4 | Verificar Sentry de punta a punta | Confirmar que el DSN está puesto en Railway y en Vercel y que **un error de prueba llega a los dos dashboards**. El SDK inicializado no prueba nada: sin DSN, `sentry_sdk.init` no hace ruido y todo parece bien. | 🟢 Baja | ⬜ |
| 4b | Blindar la llave pública de Sentry | El DSN del **frontend** viaja en el bundle del navegador: es público por diseño, no por descuido. La consecuencia es que cualquiera puede mandar eventos falsos y quemar la cuota del plan gratuito — la misma familia del EDoS que ya cuidamos con Cloudflare. Se mitiga gratis desde el panel: dominios permitidos (inbound filter), límite de tasa por llave y protección de picos. Es configuración, no código. | 🟢 Baja | ⬜ |
| 5 | Errores del worker a Sentry | El worker corre en su propio proceso y sus excepciones solo existían en el log de Railway. Ahora inicializa el SDK igual que la API, y sin DSN configurado no se toca nada. | 🟠 Media | ✅ Done |
| 6 | Alerta de correo rebotado en volumen | Ya existe el registro de fallos de envío (Fase 15). Falta avisar cuando el volumen se dispara: un dominio bloqueando nuestros correos rompe el doble opt-in del pre-registro sin que nadie lo note. | 🟠 Media | ⬜ |
| 7 | Presupuesto de ruido | Revisar qué alerta de verdad hace falta. Agrupar lo repetitivo, silenciar lo que nadie acciona y dejar el canal en un estado donde una alerta signifique algo. | 🟢 Baja | ⬜ |
| 8 | Uptime externo | Un servicio gratuito que golpee `/health` y `/health/jobs` desde fuera. El endpoint ya existe (task 3); falta darlo de alta. Si Railway se cae entero, ninguna alerta interna va a salir — por definición. | 🟢 Baja | ⬜ |
| 9 | Documentar qué se vigila | [`docs/observability.md`](../observability.md): qué dispara cada alerta, a qué canal llega, qué se espera de quien la recibe, y **siete huecos declarados** con nombre y consecuencia. Incluye cómo agregar una alerta nueva sin romper la política. Un hueco documentado se puede planear; uno implícito no. | 🟢 Baja | ✅ Done |
| 10 | Roadmap + `CLAUDE.md` | Registrar la política: todo trabajo de fondo que sostenga una promesa avisa cuando falla. Totales. | 🟢 Baja | ⬜ |

---

## Notas de diseño

**Por qué el último reintento y no el primero.** ARQ reintenta tres veces. Alertar
en cada fallo triplica el ruido de un error transitorio (un timeout de red, un
deploy a medias) que se resuelve solo en el segundo intento. Alertar solo cuando
el job se rinde deja el canal para lo que de verdad quedó sin hacer.

**Por qué el latido importa más de lo que parece.** Los errores se notan; las
ausencias no. Si el worker deja de arrancar tras un deploy, ningún cron falla —
simplemente no ocurren, y todo el sistema de alertas basado en fallos guarda un
silencio perfecto mientras las promesas de retención se acumulan sin cumplir.

**La alerta tiene que decir qué se rompió, no qué excepción salió.** "TimeoutError
en purge_donations_cron" le sirve a quien programó eso. "La purga de donaciones
no corrió; el aviso de privacidad promete borrar lo no confirmado en 7 días" le
sirve a cualquiera que la lea a las tres de la mañana.

**Qué se publica y qué no.** Este repositorio es público; el lugar donde
aterrizan las alertas, no. El token, el canal y los DSN viven en el entorno —
saber el nombre de un canal no permite publicar en él, pero es un detalle
gratuito del espacio de trabajo de quien opera, y quien forkee el proyecto no
debería heredarlo. Lo que sí se publica, y conviene publicar, es el mecanismo:
qué se vigila, cuándo dispara, y qué se espera de quien recibe la alerta.

**Relación con otras fases.** La Fase 4 tiene dos tareas pendientes de alertas
(spend caps de Vercel y alertas de ataques vía Cloudflare) que dependen de un
plan de pago. Se quedan ahí: esta fase cubre solo lo que se puede hacer sin
gastar.
