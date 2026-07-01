# Fase 9 — Reportes de campaña

> Reportes de actividad, estadísticas y mapa mundial para todos los roles.

---

## Objetivos

1. Reportes numéricos (KPIs) de cajas selladas, enviadas, rechazadas, unidades y envíos
2. Gráfica de línea — actividad diaria por período
3. Gráfica de barras — cajas por categoría y por centro
4. Mapa mundial — países involucrados en la campaña
5. Exportación CSV — datos completos del período
6. Selector de rango de fechas: 7d / 30d / 60d / rango personalizado
7. Scope por rol: volunteer/coordinator → su centro; national_admin → todos los centros

---

## Tareas

| # | Tarea | Descripción | Prioridad | Estado |
|---|-------|-------------|-----------|--------|
| 1 | Report repository | `ReportRepository` con queries: summary, activity, by_category, by_center, countries, export_rows | 🟠 | ✅ Done |
| 2 | Report schemas | `ReportSummary`, `ActivityPoint`, `CategoryBreakdown`, `CenterBreakdown`, `CountryPoint` | 🟡 | ✅ Done |
| 3 | Report router | 6 endpoints bajo `/v1/reports/campaign/{id}/...` con scoping por rol | 🟠 | ✅ Done |
| 4 | API proxies Next.js | Rutas `/api/reports/[campaignId]/{summary,activity,by-category,by-center,countries,export.csv}` | 🟡 | ✅ Done |
| 5 | Página `/dashboard/reports` | Server component; carga campañas del usuario y pasa al cliente | 🟠 | ✅ Done |
| 6 | `ReportsDashboard` | Selector de campaña, date range picker, KPI cards, gráfica de línea, gráficas de barras, mapa mundial, tabla de centros, botón CSV | 🟠 | ✅ Done |
| 7 | Sidebar — link Reportes | Visible para todos los roles (`national_admin`, `coordinator`, `volunteer`) | 🟡 | ✅ Done |
| 8 | i18n | Clave `reports` en `es.json` y `en.json` | 🟢 | ✅ Done |

---

## Detalles técnicos

### Backend (`app/repositories/report_repository.py`)

- Todos los queries JOIN `boxes → intakes` para filtrar por `campaign_id`
- Scope de centro: `national_admin` → `center_id=None` (ve todo); otros → su `center_id`
- CSV generado server-side con `csv.DictWriter` + `StreamingResponse`
- Rate limiting: 60/min para queries, 10/min para CSV export

### Frontend

- **Recharts** para gráficas (LineChart actividad, BarChart categorías y centros)
- **react-simple-maps** para mapa mundial SVG — países coloreados por intensidad de cajas (ISO alpha-2 → alpha-3 mapping incluido)
- Date presets: 7d, 30d (default), 60d, rango personalizado con `<input type="date">`
- Fetches en paralelo con `Promise.all` para minimizar latencia
- Exportar CSV abre nueva tab directamente (`/api/reports/{id}/export.csv?start=&end=`)

### Scoping

| Rol | Datos visibles |
|-----|----------------|
| `volunteer` | Su centro, campañas en que participa |
| `coordinator` | Su centro, campañas en que participa |
| `national_admin` | Todos los centros, todas las campañas |
