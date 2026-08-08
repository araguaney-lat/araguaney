import type { CenterRole } from "@/types"
import {
  Home,
  Globe,
  PackagePlus,
  Package,
  Layers,
  Truck,
  ArrowLeftRight,
  ScanLine,
  Flag,
  Building2,
  MessageCircle,
  Users,
  UserCog,
  ScrollText,
  BarChart2,
  HelpCircle,
  Inbox,
  Gift,
  ShieldAlert,
  TriangleAlert,
  MailWarning,
  Settings,
  Sparkles,
} from "lucide-react"

export type IconComponent = React.ComponentType<{ size?: number; className?: string }>

export interface NavItem {
  href: string
  labelKey: keyof DashboardNav
  roles: CenterRole[]
  icon: IconComponent
  badgeKey?: string
}

export type DashboardNav = {
  home: string
  national: string
  intake: string
  donations: string
  boxes: string
  pallets: string
  shipments: string
  transfers: string
  messages: string
  scan: string
  campaigns: string
  centers: string
  requests: string
  reports: string
  users: string
  center_applications: string
  reviews: string
  incidents: string
  audit: string
  team: string
  ayuda: string
  ops_section: string
  settings: string
  logout: string
  admin_section: string
  menu: string
}

export type DashboardRoleLabels = {
  national_admin: string
  coordinator: string
  volunteer: string
}

// Core / high-frequency items — always at the top, no group header.
export const NAV_ITEMS: NavItem[] = [
  // "Inicio" is a dead redirect to /dashboard/national for national_admin
  // (see app/dashboard/page.tsx) — Panel Nacional is already their home,
  // showing both was a duplicate entry pointing at the same page.
  { href: "/dashboard", labelKey: "home", roles: ["coordinator", "volunteer"], icon: Home },
  { href: "/dashboard/national", labelKey: "national", roles: ["national_admin"], icon: Globe },
  // Role hierarchy: national_admin sees everything coordinator/volunteer see
  // (plus their own admin-only tools) — they never lose visibility going up.
  { href: "/dashboard/boxes", labelKey: "boxes", roles: ["national_admin", "coordinator", "volunteer"], icon: Package },
  { href: "/dashboard/pallets", labelKey: "pallets", roles: ["national_admin", "coordinator"], icon: Layers },
  { href: "/dashboard/shipments", labelKey: "shipments", roles: ["national_admin", "coordinator"], icon: Truck },
  // national_admin sees "Campañas" grouped under Administración instead
  // (they're the only role that can create/manage campaigns) — this entry
  // is coordinator/volunteer-only so it never duplicates that one.
  { href: "/dashboard/campaigns", labelKey: "campaigns", roles: ["coordinator", "volunteer"], icon: Flag },
  // "Solicitudes" hidden for now — reported not working, revisit before
  // re-enabling. Left commented (not deleted) so it's easy to restore.
  // { href: "/dashboard/requests", labelKey: "requests", roles: ["national_admin", "coordinator", "volunteer"], icon: MessageSquare },
]

// Operations — day-to-day tools, grouped under its own header.
export const OPS_ITEMS: NavItem[] = [
  { href: "/dashboard/intake", labelKey: "intake", roles: ["national_admin", "coordinator", "volunteer"], icon: PackagePlus },
  // Pre-registro: lo que el donante anunció antes de llegar. Va junto a
  // Recepción porque el doble check desemboca justo en el intake.
  { href: "/dashboard/donations", labelKey: "donations", roles: ["national_admin", "coordinator", "volunteer"], icon: Gift },
  { href: "/dashboard/scan", labelKey: "scan", roles: ["national_admin", "coordinator", "volunteer"], icon: ScanLine },
  { href: "/dashboard/transfers", labelKey: "transfers", roles: ["national_admin", "coordinator"], icon: ArrowLeftRight },
  // Cola de banderas rojas: solo quien puede resolverlas la ve.
  { href: "/dashboard/reviews", labelKey: "reviews", roles: ["national_admin", "coordinator"], icon: ShieldAlert },
  { href: "/dashboard/reports", labelKey: "reports", roles: ["national_admin", "coordinator", "volunteer"], icon: BarChart2 },
  // Team directory: open to everyone. Coordinator/volunteer see their own
  // center directly; national_admin gets a center selector (scoped to their
  // own country_code) — see list_center_users in backend/app/routers/users.py.
  { href: "/dashboard/team", labelKey: "team", roles: ["national_admin", "coordinator", "volunteer"], icon: Users },
  { href: "/dashboard/messages", labelKey: "messages", roles: ["national_admin", "coordinator", "volunteer"], icon: MessageCircle, badgeKey: "messages" },
  { href: "/dashboard/ayuda", labelKey: "ayuda", roles: ["national_admin", "coordinator", "volunteer"], icon: HelpCircle },
]

export interface AdminNavItem {
  href: string
  labelKey: keyof DashboardNav
  roles: CenterRole[]
  icon: IconComponent
}

// Administration — setup/management tools, national_admin only.
export const ADMIN_ITEMS: AdminNavItem[] = [
  { href: "/dashboard/campaigns", labelKey: "campaigns", roles: ["national_admin"], icon: Flag },
  { href: "/dashboard/centers", labelKey: "centers", roles: ["national_admin"], icon: Building2 },
  { href: "/dashboard/admin/users", labelKey: "users", roles: ["national_admin"], icon: UserCog },
  { href: "/dashboard/admin/center-applications", labelKey: "center_applications", roles: ["national_admin"], icon: Inbox },
  { href: "/dashboard/admin/incidents", labelKey: "incidents", roles: ["national_admin"], icon: TriangleAlert },
  { href: "/dashboard/admin/audit", labelKey: "audit", roles: ["national_admin"], icon: ScrollText },
]

// The 4 fixed bottom-nav slots per role on mobile (5th slot is always the
// "Menú" sheet — see BottomNav.tsx). Home/Panel and Cajas are universal;
// slot 3 differs by role because the highest-frequency daily action differs
// (volunteers register intake, coordinators/national_admin verify via scan).
// Reports is deliberately left out of the fixed bar (only 4 slots exist and
// Messages' unread badge + Cajas' universality + role-specific slot 3 already
// fill the non-home slots) — it lives in the Menú sheet instead.
const MOBILE_PRIMARY_KEYS: Record<CenterRole, NavItem["labelKey"][]> = {
  national_admin: ["national", "boxes", "scan", "messages"],
  coordinator: ["home", "boxes", "scan", "messages"],
  volunteer: ["home", "boxes", "intake", "messages"],
}

const ALL_NON_ADMIN_ITEMS = [...NAV_ITEMS, ...OPS_ITEMS]

export function getMobilePrimaryItems(centerRole: CenterRole | null): NavItem[] {
  if (!centerRole) return []
  const keys = MOBILE_PRIMARY_KEYS[centerRole]
  return keys
    .map((key) => ALL_NON_ADMIN_ITEMS.find((item) => item.labelKey === key && item.roles.includes(centerRole)))
    .filter((item): item is NavItem => Boolean(item))
}

export function getMobileOverflowItems(centerRole: CenterRole | null): NavItem[] {
  if (!centerRole) return []
  const primaryHrefs = new Set(getMobilePrimaryItems(centerRole).map((item) => item.href))
  return ALL_NON_ADMIN_ITEMS.filter(
    (item) => item.roles.includes(centerRole) && !primaryHrefs.has(item.href)
  )
}


// ── Studio (superadmin) ───────────────────────────────────────────────────────
//
// Una sola lista para los dos menús. El sidebar de escritorio y la barra
// inferior de móvil la leen de aquí, y `STUDIO_PRIMARY_HREFS` decide cuáles
// quedan fijas abajo. Duplicar la lista es como una sección nueva termina
// existiendo en escritorio y siendo inalcanzable en un teléfono.
//
// Es el mismo patrón que ya usaba el panel operativo aquí arriba.

export type StudioNav = {
  menu: string
  metrics: string
  users: string
  center_applications: string
  emails: string
  ai: string
  audit: string
  settings: string
  logout: string
  back_to_dashboard: string
  superadmin: string
  platform_admin: string
}

export interface StudioNavItem {
  href: string
  labelKey: keyof StudioNav
  icon: IconComponent
  /** `/studio` es prefijo de todo lo demás: solo coincide de forma exacta. */
  exact?: boolean
}

export const STUDIO_NAV_ITEMS: StudioNavItem[] = [
  { href: "/studio", labelKey: "metrics", icon: BarChart2, exact: true },
  { href: "/studio/users", labelKey: "users", icon: Users },
  { href: "/studio/center-applications", labelKey: "center_applications", icon: Inbox },
  { href: "/studio/emails", labelKey: "emails", icon: MailWarning },
  { href: "/studio/ai", labelKey: "ai", icon: Sparkles },
  { href: "/studio/audit", labelKey: "audit", icon: ScrollText },
  { href: "/studio/settings", labelKey: "settings", icon: Settings },
]

/* Las cuatro que quedan al alcance del pulgar son **las cuatro que hoy
 * funcionan**. `/studio/users`, `/studio/audit` y `/studio/settings` son
 * marcadores de "Próximamente"; darles un lugar permanente en la barra sería
 * ofrecer cuatro veces al día algo que no hace nada. Cuando se construyan,
 * suben. */
export const STUDIO_PRIMARY_HREFS = [
  "/studio",
  "/studio/center-applications",
  "/studio/emails",
  "/studio/ai",
]

export function studioPrimaryItems(): StudioNavItem[] {
  return STUDIO_NAV_ITEMS.filter((item) => STUDIO_PRIMARY_HREFS.includes(item.href))
}

export function studioOverflowItems(): StudioNavItem[] {
  return STUDIO_NAV_ITEMS.filter((item) => !STUDIO_PRIMARY_HREFS.includes(item.href))
}

export function isStudioItemActive(pathname: string, item: StudioNavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}
