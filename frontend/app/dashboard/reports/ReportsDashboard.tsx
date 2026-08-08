"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import { Download } from "lucide-react"
import { useExportJob } from "@/hooks/useExportJob"
import { useDict } from "@/context/DictionaryContext"
import { useTheme } from "@/context/ThemeContext"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Campaign { id: string; name: string }

interface Summary {
  total_boxes: number
  sealed_boxes: number
  shipped_boxes: number
  draft_boxes: number
  rejected_boxes: number
  total_units: number
  total_intakes: number
  total_shipments: number
  active_centers: number
  rejection_rate: number
}

/** Merma de la campaña. Se consulta sin rango de fechas: un envío se recibe
 *  semanas después de despacharse, y la ventana del resto del reporte lo
 *  dejaría fuera justo cuando ya terminó su viaje. */
interface Shrinkage {
  reconciled_boxes: number
  received: number
  missing: number
  damaged: number
  retained: number
  shrinkage_pct: number
}

interface ActivityPoint {
  date: string
  total: number
  sealed: number
  rejected: number
  draft: number
  shipped: number
}

interface CategoryBreakdown { category: string; box_count: number; unit_count: number }
interface CenterBreakdown { center_id: string; center_name: string; country_code: string | null; box_count: number; unit_count: number }
interface CountryPoint { country_code: string; center_count: number; box_count: number; unit_count: number }

type Preset = "7d" | "30d" | "60d" | "range"

interface Props {
  campaigns: Campaign[]
  defaultCampaignId: string | null
  centerRole: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ["#1F5E8C", "#F3C033", "#22c55e", "#f97316", "#a855f7", "#14b8a6", "#ec4899", "#64748b"]

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

// --blue resolves to a different hex per theme; react-simple-maps needs the
// raw rgb() components at runtime to blend in the box-count intensity alpha.
const BLUE_RGB = { light: "31, 94, 140", dark: "106, 172, 224" } as const

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  AF: "AFG", AL: "ALB", DZ: "DZA", AO: "AGO", AR: "ARG", AU: "AUS", AT: "AUT",
  AZ: "AZE", BS: "BHS", BH: "BHR", BD: "BGD", BE: "BEL", BZ: "BLZ", BJ: "BEN",
  BO: "BOL", BA: "BIH", BW: "BWA", BR: "BRA", BN: "BRN", BG: "BGR", BF: "BFA",
  BI: "BDI", CV: "CPV", KH: "KHM", CM: "CMR", CA: "CAN", CF: "CAF", TD: "TCD",
  CL: "CHL", CN: "CHN", CO: "COL", CG: "COG", CD: "COD", CR: "CRI", CI: "CIV",
  HR: "HRV", CU: "CUB", CY: "CYP", CZ: "CZE", DK: "DNK", DJ: "DJI", DO: "DOM",
  EC: "ECU", EG: "EGY", SV: "SLV", GQ: "GNQ", ER: "ERI", EE: "EST", SZ: "SWZ",
  ET: "ETH", FJ: "FJI", FI: "FIN", FR: "FRA", GA: "GAB", GM: "GMB", GE: "GEO",
  DE: "DEU", GH: "GHA", GR: "GRC", GT: "GTM", GN: "GIN", GW: "GNB", GY: "GUY",
  HT: "HTI", HN: "HND", HU: "HUN", IN: "IND", ID: "IDN", IR: "IRN", IQ: "IRQ",
  IE: "IRL", IL: "ISR", IT: "ITA", JM: "JAM", JP: "JPN", JO: "JOR", KZ: "KAZ",
  KE: "KEN", KP: "PRK", KR: "KOR", KW: "KWT", KG: "KGZ", LA: "LAO", LV: "LVA",
  LB: "LBN", LS: "LSO", LR: "LBR", LY: "LBY", LT: "LTU", LU: "LUX", MG: "MDG",
  MW: "MWI", MY: "MYS", ML: "MLI", MR: "MRT", MX: "MEX", MD: "MDA", MN: "MNG",
  ME: "MNE", MA: "MAR", MZ: "MOZ", MM: "MMR", NA: "NAM", NP: "NPL", NL: "NLD",
  NZ: "NZL", NI: "NIC", NE: "NER", NG: "NGA", MK: "MKD", NO: "NOR", OM: "OMN",
  PK: "PAK", PA: "PAN", PG: "PNG", PY: "PRY", PE: "PER", PH: "PHL", PL: "POL",
  PT: "PRT", QA: "QAT", RO: "ROU", RU: "RUS", RW: "RWA", SA: "SAU", SN: "SEN",
  RS: "SRB", SL: "SLE", SO: "SOM", ZA: "ZAF", SS: "SSD", ES: "ESP", LK: "LKA",
  SD: "SDN", SR: "SUR", SE: "SWE", CH: "CHE", SY: "SYR", TW: "TWN", TJ: "TJK",
  TZ: "TZA", TH: "THA", TL: "TLS", TG: "TGO", TT: "TTO", TN: "TUN", TR: "TUR",
  TM: "TKM", UG: "UGA", UA: "UKR", AE: "ARE", GB: "GBR", US: "USA", UY: "URY",
  UZ: "UZB", VE: "VEN", VN: "VNM", YE: "YEM", ZM: "ZMB", ZW: "ZWE",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIso(d: Date) {
  return d.toISOString().slice(0, 10)
}

function presetDates(preset: Preset, customStart: string, customEnd: string): { start: string; end: string } {
  const today = new Date()
  const end = toIso(today)
  if (preset === "7d") return { start: toIso(new Date(today.getTime() - 6 * 86400000)), end }
  if (preset === "30d") return { start: toIso(new Date(today.getTime() - 29 * 86400000)), end }
  if (preset === "60d") return { start: toIso(new Date(today.getTime() - 59 * 86400000)), end }
  return { start: customStart || toIso(new Date(today.getTime() - 29 * 86400000)), end: customEnd || end }
}

function fmt(n: number) {
  return n.toLocaleString("es-MX")
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-cardB bg-card px-5 py-4">
      <p className="text-xs text-mut mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-tx"}`}>{typeof value === "number" ? fmt(value) : value}</p>
      {sub && <p className="text-xs text-fnt mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportsDashboard({ campaigns, defaultCampaignId, centerRole }: Props) {
  const dict = useDict()
  const t = dict.dashboard.reports
  const theme = useTheme()
  const blueRgb = BLUE_RGB[theme]

  const [campaignId, setCampaignId] = useState(defaultCampaignId ?? "")
  const [preset, setPreset] = useState<Preset>("30d")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const [summary, setSummary] = useState<Summary | null>(null)
  const [shrinkage, setShrinkage] = useState<Shrinkage | null>(null)
  const [activity, setActivity] = useState<ActivityPoint[]>([])
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([])
  const [byCenter, setByCenter] = useState<CenterBreakdown[]>([])
  const [countries, setCountries] = useState<CountryPoint[]>([])
  const [loading, setLoading] = useState(false)
  const csvExport = useExportJob()

  const isNational = centerRole === "national_admin"

  const { start, end } = presetDates(preset, customStart, customEnd)

  const fetchAll = useCallback(async () => {
    if (!campaignId) return
    setLoading(true)
    const qs = `?start=${start}&end=${end}`
    const base = `/api/reports/${campaignId}`

    try {
      const [sumRes, actRes, catRes, cenRes, cntRes, shrRes] = await Promise.all([
        fetch(`${base}/summary${qs}`),
        fetch(`${base}/activity${qs}`),
        fetch(`${base}/by-category${qs}`),
        fetch(`${base}/by-center${qs}`),
        fetch(`${base}/countries${qs}`),
        // Sin `qs` a propósito: la merma no se acota al rango.
        fetch(`${base}/shrinkage`),
      ])

      const [sumData, actData, catData, cenData, cntData, shrData] = await Promise.all([
        sumRes.ok ? sumRes.json() : null,
        actRes.ok ? actRes.json() : [],
        catRes.ok ? catRes.json() : [],
        cenRes.ok ? cenRes.json() : [],
        cntRes.ok ? cntRes.json() : [],
        shrRes.ok ? shrRes.json() : null,
      ])

      if (sumData) setSummary(sumData)
      setActivity(actData)
      setByCategory(catData)
      setByCenter(cenData)
      setCountries(cntData)
      setShrinkage(shrData)
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false)
    }
  }, [campaignId, start, end])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos al montar/cambiar de campaña; el patrón escalable (SWR/react-query) se rastrea aparte.
  useEffect(() => { fetchAll() }, [fetchAll])

  function handleExport() {
    if (!campaignId) return
    csvExport.reset()
    csvExport.start(`/v1/reports/campaign/${campaignId}/export.csv?start=${start}&end=${end}`)
  }

  const countrySet = new Set(countries.map((c) => ALPHA2_TO_ALPHA3[c.country_code] ?? ""))
  const countryBoxes = Object.fromEntries(countries.map((c) => [ALPHA2_TO_ALPHA3[c.country_code] ?? "", c.box_count]))
  const maxBoxes = Math.max(1, ...countries.map((c) => c.box_count))

  const categoryLabels = dict.dashboard.national.categories

  if (!campaignId) {
    return (
      <div className="rounded-xl border border-cardB bg-card p-8 text-center text-fnt text-sm">
        {t.no_campaign}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {campaigns.length > 1 && (
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="rounded-lg border border-cardB bg-card px-3 py-2 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <div className="flex rounded-lg border border-cardB overflow-hidden">
          {(["7d", "30d", "60d", "range"] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                preset === p
                  ? "bg-[var(--gold)] text-[#3B2A00]"
                  : "bg-card text-mut hover:bg-card2"
              }`}
            >
              {p === "range" ? t.preset_range : p}
            </button>
          ))}
        </div>

        {preset === "range" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-inpB bg-inp px-3 py-1.5 text-xs text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
            <span className="text-xs text-fnt">—</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-inpB bg-inp px-3 py-1.5 text-xs text-tx focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
            />
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={csvExport.isBusy}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-cardB bg-card px-3 py-1.5 text-xs font-semibold text-mut hover:bg-card2 transition-colors disabled:opacity-50"
        >
          <Download size={13} />
          {csvExport.isBusy ? dict.dashboard.common.exporting : t.export_csv}
        </button>
      </div>

      {csvExport.error && (
        <div className="rounded-lg bg-dRejB px-3 py-2 text-xs text-dRejT flex items-center justify-between">
          <span>{csvExport.error}</span>
          <button className="ml-2 underline" onClick={() => csvExport.reset()}>{dict.dashboard.common.close}</button>
        </div>
      )}

      {loading && (
        <div className="text-center text-xs text-fnt py-4">{t.loading_data}</div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label={t.kpi_total_boxes} value={summary.total_boxes} />
          <KpiCard label={t.kpi_sealed} value={summary.sealed_boxes} accent="text-[var(--dSealT)]" />
          <KpiCard label={t.kpi_shipped} value={summary.shipped_boxes} accent="text-[var(--blue)]" />
          <KpiCard label={t.kpi_rejected} value={summary.rejected_boxes}
            sub={t.rejection_rate_sub.replace("{rate}", String(summary.rejection_rate))}
            accent="text-[var(--dRejT)]" />
          {/* Espejo del rechazo en intake: uno mide lo que no se aceptó al
              entrar, este lo que no llegó al salir. Solo se muestra cuando hay
              envíos recibidos: sin base, 0% mentiría hacia abajo. */}
          {shrinkage && shrinkage.reconciled_boxes > 0 && (
            <KpiCard
              label={t.kpi_shrinkage}
              value={`${shrinkage.shrinkage_pct}%`}
              accent={shrinkage.shrinkage_pct > 0 ? "text-[var(--dRejT)]" : undefined}
              sub={t.shrinkage_sub
                .replace("{missing}", String(shrinkage.missing))
                .replace("{damaged}", String(shrinkage.damaged))
                .replace("{retained}", String(shrinkage.retained))}
            />
          )}
          <KpiCard label={t.kpi_units} value={summary.total_units} />
          <KpiCard label={t.kpi_intakes} value={summary.total_intakes} />
          <KpiCard label={t.kpi_shipments} value={summary.total_shipments} />
          {isNational && <KpiCard label={t.kpi_active_centers} value={summary.active_centers} />}
        </div>
      )}

      {/* Activity line chart */}
      {activity.length > 0 && (
        <div className="rounded-xl border border-cardB bg-card p-5">
          <p className="text-sm font-semibold text-tx mb-4">{t.chart_daily_activity}</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={activity} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="sealed" name={t.line_sealed} stroke="var(--dSealT)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="shipped" name={t.line_shipped} stroke="var(--blue)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rejected" name={t.line_rejected} stroke="var(--dRejT)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="draft" name={t.line_draft} stroke="var(--dDraftT)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By category bar chart */}
        {byCategory.length > 0 && (
          <div className="rounded-xl border border-cardB bg-card p-5">
            <p className="text-sm font-semibold text-tx mb-4">{t.chart_by_category}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={byCategory.map((r) => ({ ...r, label: categoryLabels[r.category as keyof typeof categoryLabels] ?? r.category }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} tickLine={false} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="box_count" name={t.bar_boxes} fill="var(--blue)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By center bar chart */}
        {byCenter.length > 1 && (
          <div className="rounded-xl border border-cardB bg-card p-5">
            <p className="text-sm font-semibold text-tx mb-4">{t.chart_by_center}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={byCenter.slice(0, 10).map((r) => ({ ...r, short: r.center_name.slice(0, 20) }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="short" type="category" tick={{ fontSize: 10 }} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v, _n, p) => [
                    t.tooltip_boxes.replace("{count}", fmt(Number(v))),
                    p.payload.center_name,
                  ]}
                />
                <Bar dataKey="box_count" name={t.bar_boxes} fill="var(--gold)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* World map */}
      {countries.length > 0 && (
        <div className="rounded-xl border border-cardB bg-card p-5">
          <p className="text-sm font-semibold text-tx mb-1">{t.map_title}</p>
          <p className="text-xs text-fnt mb-3">
            {countries.length === 1
              ? t.map_subtitle_one
              : t.map_subtitle_other.replace("{count}", String(countries.length))}
          </p>
          <div className="overflow-hidden rounded-lg bg-app border border-cardB" style={{ height: 340 }}>
            <ComposableMap
              projectionConfig={{ scale: 147 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const alpha3 = geo.id
                      const isActive = countrySet.has(alpha3)
                      const boxes = countryBoxes[alpha3] ?? 0
                      const intensity = isActive ? 0.3 + 0.7 * (boxes / maxBoxes) : 0
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isActive ? `rgba(${blueRgb}, ${intensity})` : "var(--chip)"}
                          stroke="var(--app)"
                          strokeWidth={0.4}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: isActive ? "var(--gold)" : "var(--line)", outline: "none", cursor: isActive ? "pointer" : "default" },
                            pressed: { outline: "none" },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {countries.map((c) => (
              <span key={c.country_code} className="inline-flex items-center gap-1 rounded-full bg-[var(--blueSoft)] px-2.5 py-0.5 text-xs font-medium text-[var(--blue)]">
                {c.country_code} · {fmt(c.box_count)} {t.country_boxes}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Center breakdown table */}
      {byCenter.length > 0 && (
        <div className="rounded-xl border border-cardB bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-line">
            <p className="text-sm font-semibold text-tx">{t.center_breakdown_title}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card2 text-xs text-mut uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">{t.col_center}</th>
                  <th className="text-left px-4 py-2.5 font-medium">{t.col_country}</th>
                  <th className="text-right px-4 py-2.5 font-medium">{t.col_boxes}</th>
                  <th className="text-right px-5 py-2.5 font-medium">{t.col_units}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {byCenter.map((row) => (
                  <tr key={row.center_id} className="hover:bg-card2 transition-colors">
                    <td className="px-5 py-3 font-medium text-tx">{row.center_name}</td>
                    <td className="px-4 py-3 text-mut">{row.country_code ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-tx">{fmt(row.box_count)}</td>
                    <td className="px-5 py-3 text-right text-tx">{fmt(row.unit_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !summary && (
        <div className="rounded-xl border border-cardB bg-card p-8 text-center text-fnt text-sm">
          {t.no_data}
        </div>
      )}
    </div>
  )
}
