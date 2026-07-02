# Load testing — Fase 12 Grupo F

Herramienta elegida: **[k6](https://k6.io)** (tarea 22). Razones: binario único sin
runtime que gestionar (no compite con el propio venv del backend como Locust),
scripts en JS simples de leer/mantener, thresholds declarativos (`p95 < Xms`,
`error rate < Y%`) que fallan el run automáticamente, y es el estándar de facto
para este tipo de prueba contra APIs REST — con salida directa a Grafana/InfluxDB
si en algún momento se quiere dashboards en vivo (no configurado aquí, solo el
resumen por consola).

```
brew install k6
```

## Estructura

```
loadtest/
  seed.py                        # Seeder — inserta datos directo en la DB (bypassa la API)
  k6/
    helpers.js                   # login + rate-limit isolation (ver nota abajo)
    scenario-intake-seal.js      # Tarea 23 — intake + sellado de cajas
    scenario-dashboard.js        # Tarea 24 — lecturas del panel nacional
    scenario-exports.js          # Tarea 25 — exports async (Fase 12 tarea 15c)
```

## Setup local

1. Backend + Postgres corriendo localmente (Docker o local), migraciones al día.
2. **Sin `REDIS_URL`** si vas a medir el impacto de los índices de DB (tarea 26)
   — con Redis activo, `app.utils.cache` cachea el panel nacional y las lecturas
   repetidas nunca tocan la base de datos, lo cual mide el caché, no el índice.
   Con Redis SÍ activo (más realista para tareas 23/25), el worker de ARQ debe
   estar corriendo (`arq app.worker.WorkerSettings`) para que la tarea 25
   (exports) no se quede colgada en `PENDING`.
3. Sembrar datos:
   ```bash
   cd backend
   DATABASE_URL=postgresql://... SECRET_KEY=... python3 -m loadtest.seed
   ```
   Por defecto: 20 centros × 300 cajas (~6000 cajas, ~80% SEALED). Ajustable con
   `N_CENTERS` / `BOXES_PER_CENTER`. Determinístico (`random.seed(42)`) — el
   mismo seed produce los mismos datos, así que correr contra dos estados de
   migración distintos (con/sin los índices del Grupo A) es una comparación
   real, no dos muestras distintas.
4. Correr un escenario:
   ```bash
   k6 run loadtest/k6/scenario-dashboard.js
   # Env opcionales: BASE_URL (default http://localhost:8000), VUS, DURATION, N_CENTERS
   BASE_URL=http://localhost:8000 VUS=30 DURATION=60s k6 run loadtest/k6/scenario-dashboard.js
   ```

## Contra staging

Mismo comando, apuntando `BASE_URL` al backend de staging — **nunca correr
contra producción** sin coordinarlo explícitamente (esto genera carga real,
puede disparar alertas de Cloudflare/Railway o, en el peor caso, saturar la DB
de un ambiente compartido). Staging necesita su propio seed — no reutilizar el
seed local contra una DB compartida sin revisar antes qué hay ahí.

## Por qué IPs sintéticas por VU

`app.utils.rate_limit` limita por IP (`get_client_ip`, honra `X-Forwarded-For`).
Corriendo desde una sola máquina, todos los VUs comparten la misma IP real —
sin el header sintético, el rate limiter (ej. `30/minute` en `/dashboard/national`)
se dispara mucho antes de que la prueba mida nada real sobre la app, y el
resultado termina siendo "qué tan rápido rechaza el rate limiter", no el
comportamiento bajo carga legítima. `helpers.js` le asigna una IP sintética
distinta a cada VU (`10.b.c.d` derivada de `__VU`), igual a como se ve el
tráfico real de producción detrás de Cloudflare (cada usuario real trae su
propia IP vía `CF-Connecting-IP`).

## Login y usuarios de prueba

`loadtest/seed.py` crea, por cada centro `N`: `coordinator-N` y `volunteer-N`
(rol de centro), más un único `national-admin` (rol nacional, `center_id=NULL`,
agrega sobre todos los centros — el caso más pesado de `AggregateRepository`).
Contraseña para todos: `LOADTEST_PASSWORD` (default `loadtest12345`). Los
scripts de k6 loguean una vez por VU (no por iteración) y reusan el token —
el login también respeta el rate limiter, así que cada VU necesita su propia
IP sintética para no agotar el límite de login (`10/5minutes`) entre todos.
