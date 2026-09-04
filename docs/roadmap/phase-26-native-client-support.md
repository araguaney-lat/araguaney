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
| 1 | `operationId` único en el sondeo de salud | `/health/jobs` se expone con `GET` y `HEAD` bajo un mismo `operationId`, cosa que la especificación OpenAPI no permite: un generador produce dos métodos con el mismo nombre y el código no compila. Separar las rutas o fijar `operation_id` explícito. **No cambia ninguna respuesta.** | 🟢 Baja | ✅ Done |
| 2 | `response_model=Token` en el inicio de sesión | `POST /v1/auth/login` no declara su respuesta, así que el contrato publica un esquema vacío y el método generado devuelve `void`, descartando la sesión. Se verificó que el diccionario que arma `_issue_session` tiene **exactamente** las ocho claves de `Token`, así que el filtrado de FastAPI no quita nada y la web sigue leyendo lo mismo. La rama de 2FA devuelve `JSONResponse` directamente y FastAPI no le aplica el modelo, así que tampoco cambia. | 🟢 Baja | ✅ Done |
| 3 | Documentar la respuesta 202 del inicio de sesión | El inicio de sesión tiene dos desenlaces: sesión completa (200) o segundo factor pendiente (202, con `partial_token`). El contrato solo describirá el primero tras la task 2. Declarar el 202 en `responses` deja el contrato completo para cualquier cliente. **Ojo:** aun así, un cliente tipado no puede expresar "200 → `Token` u 202 → otra forma" en un solo método, así que la aplicación seguirá tratando el inicio de sesión aparte; el valor aquí es que el contrato deje de mentir, no ahorrarle trabajo a un cliente. | 🟢 Baja | ✅ Done |
| 4 | Prueba de contrato: toda operación declara su respuesta | Extender `tests/contract/` para que falle si un endpoint de `/v1` publica un esquema de respuesta vacío o si dos operaciones comparten `operationId`. Sin esto, el siguiente endpoint vuelve a nacer con el mismo hueco. **Al escribirla apareció que no era un caso aislado: 20 operaciones de `/v1` tampoco declaran su respuesta.** No se arreglan a ciegas porque `response_model` filtra el cuerpo y podría quitar campos que alguien ya consume; cada una pide la comprobación que se hizo para el login. La prueba nace como trinquete, con esas 20 en una lista de excepciones que solo puede encoger. | 🟠 Media | ✅ Done |

### Reducir la deuda de respuestas sin declarar

> Las operaciones de `/v1` que no declaran su respuesta viven en la lista de
> excepciones de `tests/contract/test_openapi_quality.py`, que solo puede
> encoger. No se arreglan de una sentada: `response_model` **filtra** el cuerpo,
> así que declarar veinte a ciegas podría quitar en silencio un campo que la web
> ya lee. Cada una pide la comprobación que recibió el login (qué devuelve de
> verdad, qué lee quien lo consume, si hay ramas que devuelvan `Response`).
>
> Se agrupan por tipo porque el trabajo y el riesgo cambian según el grupo, y
> porque un PR que hace una sola clase de cambio se revisa de verdad.

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 10 | Grupo A: respuestas de imagen (2) | `GET /v1/boxes/{box_id}/qr.png` y `GET /v1/d/{code}/qr.png`. No piden modelo sino `response_class` y un `responses` con `image/png`. **Riesgo nulo:** devuelven un `Response` ya construido, que FastAPI nunca filtra. Conviene arreglar de paso los dos equivalentes fuera de `/v1` (`/b/{code}/qr.png`, `/p/{code}/qr.png`), que tienen el mismo defecto aunque la prueba no los vigile. | 🟢 Baja | ✅ Done |
| 11 | Grupo B: acciones sin cuerpo útil (8) | `verify-email`, `resend-verification`, `forgot-password`, `me/accept-terms`, `reset-password`, `totp/disable` y los dos `reinvite`. Devuelven confirmaciones pequeñas. Se comprobó que **ningún consumidor lee esas claves**: el frontend mira el estado HTTP y sigue. Siete responden `{"message": ...}` y quedan con un `MessageOut` compartido; la aceptación de términos declara la versión que registró. Que el cuerpo no aporte nada confirma que la respuesta honesta sería `204`, pero cambiar `200` con cuerpo por `204` es incompatible y dentro de `/v1` los cambios son solo aditivos: queda anotado para una `/v2`. | 🟠 Media | ✅ Done |
| 12 | Grupo C: creaciones con 201 (4) | `auth/register`, `campaigns/{campaign_id}/members`, `public/donations` y `public/donations/resend`. Tres responden `{"ok": true}` y comparten un `OkOut`; el alta de cuenta declara un token opcional porque tiene dos formas según se exija verificar el correo. El pre-registro público se anticipó como el delicado porque su respuesta alimenta la página de donación: resultó que devuelve `{"ok": true}` y que la página nunca la mira. **Con este grupo la lista de excepciones queda en cero.** | 🟠 Media | ✅ Done |
| 13 | Grupo D: lecturas (6) | `product-types/barcode/{gtin}`, `messages/unread-count`, las tres de URL firmada de adjuntos y fotos, y `public/qr/{code}`. La última es pública y cacheable en el edge, así que su forma es la que ve cualquiera que escanee un código. | 🟠 Media | ✅ Done |

Los cuatro grupos están cerrados y `_UNDECLARED_RESPONSES` quedó vacía. Se
conserva vacía a propósito: el trinquete sigue sirviendo para que una operación
nueva no pueda nacer sin declarar su respuesta.

### Avisos a la aplicación instalada

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 5 | Registro de dispositivos | Tabla `device_tokens` (usuario, token, plataforma, alta y baja) con endpoints autenticados para registrar y dar de baja. Un token es por dispositivo y por usuario: el dispositivo se comparte en un centro. | 🟠 Media | ✅ Done |
| 6 | Despacho de avisos | Trabajo en ARQ que manda a FCM (HTTP v1) los hechos que ya existen en el dominio: revisión de riesgo abierta, envío entregado, mensaje recibido. Credencial por entorno, nunca en el repositorio. | 🔴 Alta | ✅ Done |
| 7 | Baja de tokens muertos | FCM avisa cuando un token dejó de existir; darlo de baja evita acumular destinos inválidos y ruido en el registro. | 🟠 Media | ✅ Done |
| 8 | Observabilidad del despacho | El despacho es trabajo de fondo, así que avisa cuando falla y declara su ventana de latido, como manda la sección de observabilidad de `CLAUDE.md`. | 🟠 Media | ✅ Done |

### Versión mínima soportada

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 9 | Fijar los valores al publicar | `GET /v1/client/version` ya existe y lee del entorno. Documentar en el runbook cuándo se sube la versión mínima y qué implica: subirla obliga a actualizar a quien tenga una instalación vieja, y en un centro con mala conexión eso no es gratis. | 🟢 Baja | ✅ Done |

---

## Orden sugerido

1 → 2 → 3 → 4 (el contrato primero: es barato y desbloquea a cualquier cliente
generado) → 9 → 5 → 6 → 7 → 8.

Las tasks 10 a 13 no bloquean a nadie y se toman cuando haya hueco. Si se hace
alguna, la 10 va primero: es la única de riesgo nulo y deja el patrón escrito
para las demás.

Las tasks 5 a 8 son la compuerta externa de la Fase 07 del roadmap de la
aplicación; hasta que existan, la aplicación no puede recibir avisos.

---

## Pendiente — lo que el cliente nativo pide hoy

Anotado desde el repositorio de la aplicación el 2026-08-20. Ninguna de estas
tareas se implementó aquí: se documentan para que la decisión de tocarlas sea de
quien mantiene este backend, que está en producción.

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 14 | Aislar la ficha pública del QR en su propia etiqueta ✅ hecho en este PR | `GET /v1/public/qr/{code}` declara una unión (`QrBoxFicha \| QrPalletFicha`) que el generador del cliente Dart no expresa, así que la aplicación excluye su **etiqueta** entera. Como la ruta lleva `dashboard`, la exclusión se lleva también `/v1/dashboard/national` y `/v1/dashboard/weight` —que no son nacionales: `tenant_scope` las acota al centro de quien llama— y con ellas los agregados de la pantalla de inicio del móvil. Seis rutas caen por una. | 🟢 Baja | ✅ Done |
| 15 | Un stock por categoría que sea stock | `GET /v1/reports/campaign/{id}/by-category` ya se acota al centro y la aplicación lo usa, pero cuenta cajas creadas en una ventana **sin mirar su estado**: lo despachado sigue sumando. La pantalla móvil se titula «Capturado por categoría» por eso. Se agregó un filtro opcional `status` (validado contra `BOX_STATUSES`): sin él el endpoint sigue significando "capturado en la ventana"; con `status=SEALED` se lee como stock. | 🟠 Media | ✅ Done |
| 16 | Identidad en `POST /v1/auth/refresh` | El login devuelve `role`, `center_id` y `center_role`; refresh devuelve solo los tokens, aunque el access token lleva esas claims dentro. La aplicación restaura la sesión por refresh, así que cada reinicio devolvía a quien coordina convertido en voluntariado. `AuthService.refresh` ahora arma la misma identidad que el login. | 🟢 Baja | ✅ Done |
| 17 | Códigos con nombre y mensajes en español donde los lee una persona | Nueve rechazos llegan a quien opera: `EMAIL_TAKEN`, `USERNAME_TAKEN`, `INVALID_ROLE`, `PROTECTED_CAMPAIGN`, `ACCOUNT_DISABLED`, `EMAIL_NOT_VERIFIED`, `NOT_CAMPAIGN_MEMBER`, `SELF_REVIEW` y el 403 de hilo de campaña, que además usaba el código genérico `FORBIDDEN` y por eso la aplicación no podía distinguirlo de un «esto no te toca». Los dos sitios de `ThreadService` que denegaban por membresía de campaña pasaron a `NOT_CAMPAIGN_MEMBER`, igual que `IntakeService`. Los mensajes que estaban en inglés (`EMAIL_TAKEN`, `USERNAME_TAKEN`, `INVALID_ROLE`, `ACCOUNT_DISABLED`, `EMAIL_NOT_VERIFIED`, `PROTECTED_CAMPAIGN`, y el de `NOT_CAMPAIGN_MEMBER` en `IntakeService`) se tradujeron; el código (identificador) no cambia. | 🟠 Media | ✅ Done |
| 18 | Nombres de centro en `TransferOut` | Lleva `from_center_id` y `to_center_id`, y `GET /v1/centers` exige `national_admin`, así que una coordinación no podía nombrar al otro centro de su propia transferencia. `TransferOut`/`TransferDetailOut` ahora traen `from_center_name`/`to_center_name`, resueltos en lote (`CenterRepository.names_by_ids`) para no volver N+1 en el listado. | 🟢 Baja | ✅ Done |
| 19 | `GET /v1/intakes/{id}` | Existe la lista y la creación, no el detalle. Un aviso de revisión de riesgo apunta a una captura concreta y la aplicación solo podía abrir la lista. Se agregó siguiendo el mismo patrón que `GET /v1/boxes/{id}` (scoping de tenant + 404 vía `api_error`). | 🟢 Baja | ✅ Done |
| 20 | Cuerpo tipado en `POST /v1/pallets/{id}/add-box` | Recibía un `dict` sin declarar, así que el cliente generado no tenía modelo y la clave `code` se escribía a mano. Se agregó `PalletAddBoxIn` (StrictModel, `extra="forbid"`); la huella de contrato se regeneró porque `code` pasó de implícito a declarado obligatorio (ya lo era en tiempo de ejecución, esto solo lo hace explícito). | 🟢 Baja | ✅ Done |

### Sobre la tarea 14, ya aplicada

**`tags=["qr"]` en el decorador no basta**:
FastAPI suma las etiquetas de la ruta a las del router, y la ruta queda con
`["dashboard", "qr"]`, que la exclusión sigue atrapando. Hace falta un
`APIRouter` propio montado aparte, que es como quedó. El contrato que exige que
esa ruta no tenga `response_model` se mantiene —solo se lee del router nuevo— y
una prueba nueva falla si alguien devuelve la ficha a una etiqueta compartida.

El detalle completo de cada petición, con lo que la aplicación hace mientras
tanto, vive en
[`araguaney-app/docs/backend-requests.md`](https://github.com/araguaney-lat/araguaney-app/blob/main/docs/backend-requests.md).
