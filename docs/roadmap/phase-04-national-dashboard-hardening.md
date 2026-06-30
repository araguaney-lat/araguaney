### Fase 4 — Panel agregado nacional y endurecimiento ⬜

> Visibilidad nacional + resiliencia mediática.
> Criterios de aceptación: el agregado refleja el stock real de todos los centros; las rutas públicas resisten picos vía cache; el acceso directo a la URL de Railway queda bloqueado.

#### Backend

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Consultas agregadas | Stock por categoría/INN/strength, por centro y total | 🟠 | ✅ Done |
| 2 | Endpoint público "qué falta / qué sobra" | Solo lectura, cacheable en edge | 🟡 | ✅ Done |
| 3 | PWA + captura offline | Sync diferido tolerante a red intermitente | 🔴 | ⬜ Pendiente |
| 16 | Escáner QR por cámara (móvil) | Lector de QR nativo desde el navegador móvil; aplica a ficha de caja (`/b/{code}`) y tarima (`/p/{code}`) — biblioteca `html5-qrcode` o `@zxing/browser` | 🟡 | ✅ Done |
| 17 | Escáner de código de barras (móvil) | Lectura de GTIN desde cámara en el formulario de intake (reemplaza el campo de texto manual) — misma biblioteca que QR; fallback a input manual | 🟡 | ✅ Done |

#### Frontend

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 4 | Dashboard nacional (admin) | Agregado visual de stock por categoría y centro | 🟠 | ✅ Done |
| 5 | Página pública de necesidades | "Qué falta" sin login; cacheable | 🟡 | ✅ Done |
| 23 | Home page | Landing pública con descripción del proyecto, acceso a `/necesidades` y CTA de login; reemplaza el redirect directo a `/dashboard` | 🟡 | ✅ Done |
| 24 | Login UI | Pantalla de login con diseño propio (logo, branding); actualmente es formulario básico sin estilos | 🟡 | ✅ Done |
| 25 | i18n — español / inglés | Internacionalización con `next-intl`; español por default; inglés como segunda lengua; aplica a todas las páginas públicas y el dashboard | 🟠 | ⬜ Pendiente |

#### Infra / seguridad

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 6 | Cloudflare-only mode activado | `CLOUDFLARE_ONLY=true`; bloqueo directo a Railway URL — middleware ya en `main.py`, solo falta variable de entorno + DNS apuntando a Cloudflare | 🟡 | ✅ Done |
| 7 | WAF + rate limiting afinados | Reglas Cloudflare para rutas críticas (`/v1/auth/*`, `/v1/intakes`, endpoints de PDF); activar Bot Fight Mode | 🟡 | ✅ Done |
| 8 | Turnstile en formularios públicos | Token Turnstile en ficha pública QR + validación backend en `POST /v1/intakes`; `TURNSTILE_SECRET_KEY` en env | 🟢 | ✅ Done |
| 9 | Spend caps Vercel + alertas | Configurar spend cap en Vercel dashboard; activar alertas de uso de banda | 🟢 | ⬜ Pendiente (plan de pago) |
| 18 | Configurar Sentry en producción | Agregar `SENTRY_DSN` en Railway env vars — SDK ya inicializado en `main.py`; verificar que llegan errores 500 al dashboard de Sentry | 🟢 | ✅ Done |
| 19 | Configurar Resend en producción | Agregar `RESEND_API_KEY` + dominio verificado en Resend; SDK ya instalado; configurar `FROM_EMAIL` en env Railway y Vercel | 🟢 | ⬜ Pendiente |
| 20 | PgBouncer tuning (Railway) | Railway Postgres incluye PgBouncer en modo transaction; ajustar `pool_size=5`, `max_overflow=10`, `pool_pre_ping=True` en `database.py`; deshabilitar `AUTOCOMMIT` — previene agotamiento de conexiones bajo carga | 🟡 | ✅ Done |
| 21 | Alertas de ataques (Cloudflare + Sentry) | Activar notificaciones de Cloudflare por spikes de tráfico; configurar alerta Sentry para errores 429 (rate limit hit) y 403 (Cloudflare block) en producción | 🟡 | ⬜ Pendiente |
| 22 | Deploy inicial: dominio + DNS + Railway + Vercel | Apuntar dominio a Cloudflare; configurar Railway service + Postgres + Redis; configurar Vercel project + env vars; smoke test end-to-end | 🟠 | ✅ Done |

#### OTP / Autenticación en dos pasos (2FA)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 10 | Activar capa `pyotp` | Uncomment `pyotp==2.9.0` en `requirements.txt`; aplicar la capa opcional del boilerplate | 🟢 | ⬜ Pendiente |
| 11 | Endpoints TOTP backend | `POST /v1/auth/totp/setup` (genera secret + QR), `POST /v1/auth/totp/verify` (activa), `POST /v1/auth/totp/disable` | 🟠 | ⬜ Pendiente |
| 12 | Columnas en `users` (migración `004_users_totp`) | `totp_secret` (Fernet-encrypted), `totp_enabled`, `totp_backup_codes` (hashed) | 🟡 | ⬜ Pendiente |
| 13 | Guard en login flow | Si `totp_enabled`, el login devuelve `requires_totp: true`; el cliente envía el código TOTP en un segundo paso antes de recibir el JWT | 🟠 | ⬜ Pendiente |
| 14 | UI de configuración OTP | Pantalla en `/dashboard/settings/security`: mostrar QR para escanear con app (Google Auth, Authy), campo de verificación, opción de desactivar, mostrar códigos de recuperación | 🟠 | ⬜ Pendiente |
| 15 | UI del segundo factor en login | Pantalla intermedia que pide el código de 6 dígitos (o un código de recuperación) cuando `requires_totp: true` | 🟡 | ⬜ Pendiente |

> **Nota de seguridad:** el `totp_secret` se almacena cifrado con Fernet (ya disponible en `app.utils.crypto`). Los códigos de recuperación se generan una vez, se muestran al usuario y se almacenan hasheados (bcrypt). El OTP es opcional por usuario; coordinadores y voluntarios pueden activarlo voluntariamente. El `national_admin` debería tenerlo obligatorio (enforce en middleware).
