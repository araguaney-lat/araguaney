from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Acopio API"
    debug: bool = False

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str
    # Direct connection to Postgres, bypassing any PgBouncer proxy. Used by Alembic
    # migrations (PgBouncer transaction mode is incompatible with DDL). Falls back
    # to database_url when empty. On Railway, set this to the Postgres *public* URL.
    database_url_direct: str = ""
    # Set True when a PgBouncer proxy sits in front of PostgreSQL: switches
    # SQLAlchemy to NullPool and disables prepared statements.
    pgbouncer_mode: bool = False

    # ── JWT ───────────────────────────────────────────────────────────────────
    secret_key: str
    algorithm: str = "HS256"
    # Access token corto: si se filtra, la ventana de uso es de minutos. El
    # cliente lo renueva en silencio con el refresh token, sin re-teclear
    # contraseña. Antes eran 24h, sin refresh.
    access_token_expire_minutes: int = 30
    # Refresh token de larga vida (rotatorio, con detección de reuso). Define
    # cada cuánto, como máximo, hay que volver a iniciar sesión de verdad.
    refresh_token_expire_days: int = 30
    # Ventana de gracia para la detección de reuso. Un cliente puede disparar dos
    # renovaciones casi a la vez (p. ej. el middleware y la página de Next leen la
    # sesión en paralelo cerca del vencimiento): reusar el token recién rotado
    # dentro de esta ventana es ese doble disparo, no un robo, así que no tumba la
    # sesión. Un reuso más tarde sí es sospechoso. No es un umbral antifraude;
    # ajustable por entorno si hiciera falta.
    refresh_reuse_leeway_seconds: int = 10

    # ── Versión del cliente nativo ────────────────────────────────────────────
    # La app instalada (a diferencia de la web) no se actualiza al instante. Estos
    # valores los publica GET /v1/client/version para que la app decida si puede
    # seguir o debe pedir actualización, en vez de fallar en silencio con un 422
    # cuando un schema cambia. Se fijan cuando la app nativa exista; el default
    # "0.0.0" no obliga a nada.
    min_supported_client_version: str = "0.0.0"
    latest_client_version: str = "0.0.0"

    # ── Encryption ────────────────────────────────────────────────────────────
    # Fernet key for app.utils.crypto (encrypting sensitive DB values such as
    # third-party API keys). Falls back to secret_key when empty; prefer a
    # dedicated key in production. Generate: python -c "import secrets; print(secrets.token_hex(32))"
    encryption_key: str = ""

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins (multi-origin CORS support)
    # When building URLs for emails, always use: frontend_url.split(",")[0].strip()
    frontend_url: str = "http://localhost:3000"

    # ── Internal API secret ───────────────────────────────────────────────────
    # Shared between Next.js server actions and FastAPI to protect
    # server-to-server endpoints (e.g. POST /internal/*) from public access
    internal_api_secret: str = ""

    # ── Email — Resend ────────────────────────────────────────────────────────
    resend_api_key: str = ""
    mail_from: str = "noreply@yourdomain.com"
    mail_from_name: str = "My App"
    # Svix signing secret for the Resend webhook (Dashboard → Webhooks). Empty
    # disables webhook processing (endpoint returns 503).
    resend_webhook_secret: str = ""

    # ── IndexNow (Bing/Yandex instant indexing) ───────────────────────────────
    # Public token — NOT a secret. Must match the key file served at
    # {frontend_url}/{indexnow_key}.txt (see frontend/public/). Empty disables
    # pinging (no-op). See Fase 17 task 2.
    indexnow_key: str = ""

    # ── Trusted proxy IPs ─────────────────────────────────────────────────────
    # Set to "*" on Railway (all traffic passes through Railway's proxy)
    trusted_proxy_ips: str = "127.0.0.1"

    # ── Security ──────────────────────────────────────────────────────────────
    # Comma-separated IPs allowed to hit admin/internal routes (empty = open)
    admin_allowed_ips: str = ""
    # Set to true in production to require Cloudflare proxy (blocks direct origin hits).
    # On platforms where a proxy sits between Cloudflare and the app (e.g. Railway),
    # the raw TCP peer is never actually Cloudflare's edge IP — it's the platform's own
    # internal proxy — so this MUST be paired with cloudflare_shared_secret below.
    cloudflare_only: bool = False
    # Shared secret validated against a request header (default: X-Origin-Auth) that a
    # Cloudflare Transform Rule injects on every request before it reaches the origin.
    # Required whenever cloudflare_only=True — see .env.example for setup instructions.
    cloudflare_shared_secret: str = ""
    # Google Safe Browsing API key — enables URL reputation checks in
    # app.utils.url_security.check_safe_browsing (optional; fails open when empty)
    google_safe_browsing_api_key: str = ""

    # ── Open Food Facts ───────────────────────────────────────────────────────
    # Public API — no key required. Timeout in seconds (default 5).
    open_food_facts_timeout: float = 5.0

    # ── Redis (background jobs + cache) ─────────────────────────────────────────
    # Powers app.utils.cache and the ARQ durable task queue. Everything degrades
    # gracefully when empty (no-op cache, in-process BackgroundTasks fallback).
    # Railway injects REDIS_URL automatically when the Redis addon is added.
    redis_url: str = ""

    # ── Sentry (optional — error tracking disabled when absent) ───────────────
    sentry_dsn: str = ""
    sentry_environment: str = "production"

    # ── Slack Bot (optional — notifications disabled when absent) ─────────────
    # Bot Token from api.slack.com → Your App → OAuth & Permissions (xoxb-...)
    # One token covers all channels; invite bot to each channel with /invite @bot
    slack_bot_token: str = ""
    # Canal al que van las alertas. Vive en el entorno y no en el código porque
    # es el espacio de trabajo de quien opera, no una constante del software:
    # este repositorio es público y quien lo forkee no debe heredar el canal de
    # nadie. Vacío = las alertas se registran en el log y no salen a ningún lado.
    slack_alert_channel: str = ""

    # =========================================================================
    # OPTIONAL LAYERS — uncomment + set env vars to activate
    # See docs/optional-layers.md for full setup instructions
    # =========================================================================

    # ── Cloudinary (optional — image / video uploads) ─────────────────────────
    # pip install cloudinary==1.41.0
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # ── IA asistida (Fase 23) ────────────────────────────────────────────────
    # Capa OpenAI-compatible: OpenAI, DeepSeek, Groq, Together u Ollama local
    # entran cambiando `ai_base_url`. Sin `ai_api_key` la IA queda apagada y la
    # aplicación se comporta exactamente como antes de esta fase.
    # ── Avisos push (Fase 26) ────────────────────────────────────────────────
    # Apagado por defecto: con `push_enabled=False` los tokens se registran pero
    # no sale ningún aviso, y la aplicación se comporta como antes de la fase.
    push_enabled: bool = False
    # El JSON completo de la cuenta de servicio, en una línea. Es una credencial
    # y por eso vive en el entorno, nunca en el repositorio.
    firebase_service_account_json: str = ""

    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o-mini"
    # Tope de gasto mensual. Al alcanzarlo, las capacidades se apagan solas y la
    # operación sigue: el riesgo de esta fase no es el precio unitario, es el
    # volumen sin control.
    ai_monthly_budget_usd: float = 20.0
    # Bandera por capacidad: encender una no enciende las demás. Ninguna se
    # invoca desde un endpoint público.
    ai_enable_text_mapping: bool = False
    ai_enable_label_ocr: bool = False
    ai_enable_needs_matching: bool = False
    ai_enable_national_summary: bool = False

    # ── Langfuse (optional — LLM observability) ───────────────────────────────
    # pip install langfuse==2.26.0
    # langfuse_public_key: str = ""
    # langfuse_secret_key: str = ""
    # langfuse_host: str = "https://cloud.langfuse.com"

    # ── Stripe (optional — payments & subscriptions) ──────────────────────────
    # pip install stripe==11.2.0
    # stripe_secret_key: str = ""
    # stripe_webhook_secret: str = ""
    # stripe_price_id_pro: str = ""   # add one per plan

    # ── 2FA / TOTP (optional — authenticator apps) ────────────────────────────
    # pip install pyotp==2.9.0 qrcode[pil]==8.0
    # totp_issuer: str = "My App"

    # ── GeoIP / MaxMind (optional — country / city lookup) ───────────────────
    # pip install geoip2==4.8.0
    # Download GeoLite2-City.mmdb from maxmind.com (free account required)
    # geoip_db_path: str = "/data/GeoLite2-City.mmdb"

    # ── Cloudflare R2 (messaging attachments) ────────────────────────────────
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_url: str = ""   # e.g. https://pub-xxx.r2.dev

    # ── ElevenLabs (optional — AI voice generation) ────────────────────────────
    # pip install elevenlabs==1.9.0
    # elevenlabs_api_key: str = ""
    # elevenlabs_voice_id: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
