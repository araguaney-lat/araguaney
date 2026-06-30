### Fase 4 — Panel agregado nacional y endurecimiento ✅

> Visibilidad nacional + resiliencia mediática.
> Criterios de aceptación: el agregado refleja el stock real de todos los centros; las rutas públicas resisten picos vía cache; el acceso directo a la URL de Railway queda bloqueado.

#### Backend

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 1 | Consultas agregadas | Stock por categoría/INN/strength, por centro y total | 🟠 | ✅ Done |
| 2 | Endpoint público "qué falta / qué sobra" | Solo lectura, cacheable en edge | 🟡 | ✅ Done |
| 3 | PWA + captura offline | Shell caching + offline fallback + SW registration; sync diferido (IndexedDB) en Fase 5 | 🔴 | ✅ Done (MVP) |
| 16 | Escáner QR por cámara (móvil) | Lector de QR nativo desde el navegador móvil; aplica a ficha de caja (`/b/{code}`) y tarima (`/p/{code}`) — biblioteca `html5-qrcode` o `@zxing/browser` | 🟡 | ✅ Done |
| 17 | Escáner de código de barras (móvil) | Lectura de GTIN desde cámara en el formulario de intake (reemplaza el campo de texto manual) — misma biblioteca que QR; fallback a input manual | 🟡 | ✅ Done |

#### Frontend

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 4 | Dashboard nacional (admin) | Agregado visual de stock por categoría y centro | 🟠 | ✅ Done |
| 5 | Página pública de necesidades | "Qué falta" sin login; cacheable | 🟡 | ✅ Done |
| 23 | Home page | Landing pública con descripción del proyecto, acceso a `/necesidades` y CTA de login; reemplaza el redirect directo a `/dashboard` | 🟡 | ✅ Done |
| 24 | Login UI | Pantalla de login con diseño propio (logo, branding); actualmente es formulario básico sin estilos | 🟡 | ✅ Done |
| 25 | i18n — español / inglés | Diccionarios ES/EN en `src/dictionaries/`; `getDictionary()` en layouts; dashboard nav y roles traducidos; español por default | 🟠 | ✅ Done |

#### Infra / seguridad

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 6 | Cloudflare-only mode activado | `CLOUDFLARE_ONLY=true`; bloqueo directo a Railway URL — middleware ya en `main.py`, solo falta variable de entorno + DNS apuntando a Cloudflare | 🟡 | ✅ Done |
| 7 | WAF + rate limiting afinados | Reglas Cloudflare para rutas críticas (`/v1/auth/*`, `/v1/intakes`, endpoints de PDF); activar Bot Fight Mode | 🟡 | ✅ Done |
| 8 | Turnstile en formularios públicos | Token Turnstile en ficha pública QR + validación backend en `POST /v1/intakes`; `TURNSTILE_SECRET_KEY` en env | 🟢 | ✅ Done |
| 9 | Spend caps Vercel + alertas | Configurar spend cap en Vercel dashboard; activar alertas de uso de banda | 🟢 | ⬜ Pendiente (plan de pago) |
| 18 | Configurar Sentry en producción | Agregar `SENTRY_DSN` en Railway env vars — SDK ya inicializado en `main.py`; verificar que llegan errores 500 al dashboard de Sentry | 🟢 | ✅ Done |
| 19 | Configurar Resend en producción | Agregar `RESEND_API_KEY` + dominio verificado en Resend; SDK ya instalado; configurar `FROM_EMAIL` en env Railway y Vercel | 🟢 | ✅ Done |
| 20 | PgBouncer tuning (Railway) | Railway Postgres incluye PgBouncer en modo transaction; ajustar `pool_size=5`, `max_overflow=10`, `pool_pre_ping=True` en `database.py`; deshabilitar `AUTOCOMMIT` — previene agotamiento de conexiones bajo carga | 🟡 | ✅ Done |
| 21 | Alertas de ataques (Cloudflare + Sentry) | Activar notificaciones de Cloudflare por spikes de tráfico; configurar alerta Sentry para errores 429 (rate limit hit) y 403 (Cloudflare block) en producción | 🟡 | ⬜ Pendiente (plan de pago) |
| 22 | Deploy inicial: dominio + DNS + Railway + Vercel | Apuntar dominio a Cloudflare; configurar Railway service + Postgres + Redis; configurar Vercel project + env vars; smoke test end-to-end | 🟠 | ✅ Done |

#### OTP / Autenticación en dos pasos (2FA)

| # | Tarea | Descripción | Complejidad | Estado |
|---|-------|-------------|-------------|--------|
| 10 | Activar capa `pyotp` | Uncomment `pyotp==2.9.0` en `requirements.txt`; aplicar la capa opcional del boilerplate | 🟢 | ✅ Done |
| 11 | Endpoints TOTP backend | `POST /v1/auth/totp/setup` (genera secret + QR), `POST /v1/auth/totp/confirm` (activa), `POST /v1/auth/totp/disable`, `POST /v1/auth/totp/challenge` | 🟠 | ✅ Done |
| 12 | Columnas en `users` (migración `007_users_totp`) | `totp_secret` (Fernet-encrypted), `totp_enabled`, `totp_backup_codes` (JSON array de bcrypt hashes) | 🟡 | ✅ Done |
| 13 | Guard en login flow | Si `totp_enabled`, el login devuelve HTTP 202 `requires_totp: true` + partial token; cliente redirige a `/login/2fa` | 🟠 | ✅ Done |
| 14 | UI de configuración OTP | `/dashboard/settings/security`: QR, campo de verificación, activar/desactivar, 10 códigos de recuperación | 🟠 | ✅ Done |
| 15 | UI del segundo factor en login | Página `/login/2fa` con modo TOTP y modo código de respaldo; partial token en sessionStorage | 🟡 | ✅ Done |

> **Nota de seguridad:** el `totp_secret` se almacena cifrado con Fernet (ya disponible en `app.utils.crypto`). Los códigos de recuperación se generan una vez, se muestran al usuario y se almacenan hasheados (bcrypt). El OTP es opcional por usuario; coordinadores y voluntarios pueden activarlo voluntariamente. El `national_admin` debería tenerlo obligatorio (enforce en middleware).
