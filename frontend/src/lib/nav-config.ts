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
  { href: "/dashboard/scan", labelKey: "scan", roles: ["national_admin", "coordinator", "volunteer"], icon: ScanLine },
  { href: "/dashboard/transfers", labelKey: "transfers", roles: ["national_admin", "coordinator"], icon: ArrowLeftRight },
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
