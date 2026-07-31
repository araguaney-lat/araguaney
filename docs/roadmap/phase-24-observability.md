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
| 1 | Alerta cuando un job agota sus reintentos | Decorador sobre las tareas de ARQ que avisa a Slack **solo en el último intento** (`job_try == max_tries`), para que un fallo transitorio no genere tres alertas. Hoy `retry_jobs=True, max_tries=3` y al tercer fallo el job simplemente desaparece. Patrón de bioflow. | 🔴 Alta | ⬜ |
| 2 | Alerta de cron de purga con contexto de retención | Los cinco crons de purga avisan al fallar diciendo **qué plazo publicado queda incumplido** ("la purga de donaciones no corrió; el aviso promete 7 días"). Distinguir esto de un fallo cualquiera es lo que convierte la alerta en acción. | 🟠 Media | ⬜ |
| 3 | Latido de los crons | Un cron que nunca se ejecuta no falla, y por eso no alerta. Registrar la última corrida exitosa de cada cron y avisar si alguno lleva más de lo esperado sin correr. Sin tabla nueva: basta una fila por cron en `system_settings` o equivalente. | 🟠 Media | ⬜ |
| 4 | Verificar Sentry de punta a punta | Confirmar que el DSN está puesto en Railway y en Vercel y que **un error de prueba llega a los dos dashboards**. El SDK inicializado no prueba nada: sin DSN, `sentry_sdk.init` no hace ruido y todo parece bien. | 🟢 Baja | ⬜ |
| 4b | Blindar la llave pública de Sentry | El DSN del **frontend** viaja en el bundle del navegador: es público por diseño, no por descuido. La consecuencia es que cualquiera puede mandar eventos falsos y quemar la cuota del plan gratuito — la misma familia del EDoS que ya cuidamos con Cloudflare. Se mitiga gratis desde el panel: dominios permitidos (inbound filter), límite de tasa por llave y protección de picos. Es configuración, no código. | 🟢 Baja | ⬜ |
| 5 | Errores del worker a Sentry | El worker de ARQ corre en su propio proceso y hoy no inicializa Sentry: sus excepciones no llegan a ningún dashboard. Inicializarlo igual que la API. | 🟠 Media | ⬜ |
| 6 | Alerta de correo rebotado en volumen | Ya existe el registro de fallos de envío (Fase 15). Falta avisar cuando el volumen se dispara: un dominio bloqueando nuestros correos rompe el doble opt-in del pre-registro sin que nadie lo note. | 🟠 Media | ⬜ |
| 7 | Presupuesto de ruido | Revisar qué alerta de verdad hace falta. Agrupar lo repetitivo, silenciar lo que nadie acciona y dejar el canal en un estado donde una alerta signifique algo. | 🟢 Baja | ⬜ |
| 8 | Uptime externo | Un servicio gratuito que golpee `/health` desde fuera. Si Railway se cae entero, ninguna alerta interna va a salir — por definición. | 🟢 Baja | ⬜ |
| 9 | Documentar qué se vigila | Sección en `docs/security.md` o en un `docs/observability.md`: qué dispara una alerta, a qué canal llega, qué se espera que haga quien la recibe, y **qué no está cubierto**. Un hueco documentado se puede planear; uno implícito no. | 🟢 Baja | ⬜ |
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
