# Fase 26 — Soporte de backend para el cliente nativo

> El cliente móvil vive en un repositorio aparte
> ([`araguaney-lat/araguaney-app`](https://github.com/araguaney-lat/araguaney-app), Flutter)
> y consume esta API a través de un cliente Dart **generado** desde el
> `openapi.json` que publica este backend. Esa forma de trabajar convierte en
> defecto lo que antes era una omisión inocua: un endpoint que no declara su
> respuesta produce un método generado que descarta datos, y dos operaciones que
> comparten `operationId` producen código que ni siquiera compila.
>
> Esta fase agrupa lo que el backend le debe al cliente nativo. Nace de la
> Fase 01 del roadmap de la aplicación, donde los dos defectos de contrato se
> encontraron al generar el cliente por primera vez.

---

## Objetivos

1. Que el contrato publicado describa lo que los endpoints devuelven de verdad.
2. Que `openapi.json` sea válido, para que cualquier cliente generado compile.
3. Que la aplicación instalada pueda recibir avisos de lo que ocurre en su centro.

## No-objetivos

- Cambios de comportamiento en endpoints existentes. Todo lo de esta fase es
  aditivo dentro de `/v1`, según la regla de compatibilidad de `CLAUDE.md`.
- Lógica de presentación para la aplicación: el cliente es una capa fina y las
  reglas siguen viviendo aquí.

---

## Tareas

### Corrección del contrato publicado

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | `operationId` único en el sondeo de salud | `/health/jobs` se expone con `GET` y `HEAD` bajo un mismo `operationId`, cosa que la especificación OpenAPI no permite: un generador produce dos métodos con el mismo nombre y el código no compila. Separar las rutas o fijar `operation_id` explícito. **No cambia ninguna respuesta.** | 🟢 Baja | ⬜ Pendiente |
| 2 | `response_model=Token` en el inicio de sesión | `POST /v1/auth/login` no declara su respuesta, así que el contrato publica un esquema vacío y el método generado devuelve `void`, descartando la sesión. Se verificó que el diccionario que arma `_issue_session` tiene **exactamente** las ocho claves de `Token`, así que el filtrado de FastAPI no quita nada y la web sigue leyendo lo mismo. La rama de 2FA devuelve `JSONResponse` directamente y FastAPI no le aplica el modelo, así que tampoco cambia. | 🟢 Baja | ⬜ Pendiente |
| 3 | Documentar la respuesta 202 del inicio de sesión | El inicio de sesión tiene dos desenlaces: sesión completa (200) o segundo factor pendiente (202, con `partial_token`). El contrato solo describirá el primero tras la task 2. Declarar el 202 en `responses` deja el contrato completo para cualquier cliente. **Ojo:** aun así, un cliente tipado no puede expresar "200 → `Token` u 202 → otra forma" en un solo método, así que la aplicación seguirá tratando el inicio de sesión aparte; el valor aquí es que el contrato deje de mentir, no ahorrarle trabajo a un cliente. | 🟢 Baja | ⬜ Pendiente |
| 4 | Prueba de contrato: toda operación declara su respuesta | Extender `tests/contract/` para que falle si un endpoint de `/v1` publica un esquema de respuesta vacío o si dos operaciones comparten `operationId`. Sin esto, el siguiente endpoint vuelve a nacer con el mismo hueco. | 🟠 Media | ⬜ Pendiente |

### Avisos a la aplicación instalada

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 5 | Registro de dispositivos | Tabla `device_tokens` (usuario, token, plataforma, alta y baja) con endpoints autenticados para registrar y dar de baja. Un token es por dispositivo y por usuario: el dispositivo se comparte en un centro. | 🟠 Media | ⬜ Pendiente |
| 6 | Despacho de avisos | Trabajo en ARQ que manda a FCM (HTTP v1) los hechos que ya existen en el dominio: revisión de riesgo abierta, envío entregado, mensaje recibido. Credencial por entorno, nunca en el repositorio. | 🔴 Alta | ⬜ Pendiente |
| 7 | Baja de tokens muertos | FCM avisa cuando un token dejó de existir; darlo de baja evita acumular destinos inválidos y ruido en el registro. | 🟠 Media | ⬜ Pendiente |
| 8 | Observabilidad del despacho | El despacho es trabajo de fondo, así que avisa cuando falla y declara su ventana de latido, como manda la sección de observabilidad de `CLAUDE.md`. | 🟠 Media | ⬜ Pendiente |

### Versión mínima soportada

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 9 | Fijar los valores al publicar | `GET /v1/client/version` ya existe y lee del entorno. Documentar en el runbook cuándo se sube la versión mínima y qué implica: subirla obliga a actualizar a quien tenga una instalación vieja, y en un centro con mala conexión eso no es gratis. | 🟢 Baja | ⬜ Pendiente |

---

## Orden sugerido

1 → 2 → 3 → 4 (el contrato primero: es barato y desbloquea a cualquier cliente
generado) → 9 → 5 → 6 → 7 → 8.

Las tasks 5 a 8 son la compuerta externa de la Fase 07 del roadmap de la
aplicación; hasta que existan, la aplicación no puede recibir avisos.
