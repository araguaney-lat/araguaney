// ── Platform user ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: "user" | "admin" | "superadmin"
  plan: "free" | "pro"
  is_active: boolean
  is_verified: boolean
  created_at: string
}

// ── Domain ────────────────────────────────────────────────────────────────────

export type CenterRole = "national_admin" | "coordinator" | "volunteer"

export interface UserOut {
  id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: "user" | "admin" | "superadmin"
  plan: "free" | "pro"
  is_active: boolean
  is_verified: boolean
  center_id: string | null
  center_role: CenterRole | null
  country_code: string | null
  created_at: string
}

export interface UserProfileOut {
  id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  center_role: CenterRole | null
  center_id: string | null
  center_name: string | null
  campaigns: { id: string; name: string }[]
}

export type ProductCategory =
  | "MEDICINE"
  | "MEDICAL_SUPPLY"
  | "FOOD"
  | "WATER"
  | "HYGIENE"
  | "TOOL"
  | "RESCUE_GEAR"
  | "OTHER"

export interface Campaign {
  id: string
  name: string
  slug: string | null
  origin_country: string | null
  destination_country: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  is_general: boolean
  created_at: string
}

export interface PublicCampaignListItem {
  slug: string
  name: string
  destination_country: string | null
}

export interface PublicCampaign {
  slug: string
  name: string
  description: string | null
  destination_country: string | null
  start_date: string | null
  end_date: string | null
  by_category: { category: string; total_units: number; box_count: number }[]
}

export interface BarcodePrefill {
  gtin: string
  display_name: string
  brand: string | null
  category: string
}

export interface BarcodeResult {
  source: "local" | "open_food_facts"
  product_type: ProductType | null
  prefill: BarcodePrefill | null
}

export interface CampaignMember {
  id: string
  email: string
  username: string
  full_name: string | null
  center_role: CenterRole | null
  center_id: string | null
  is_active: boolean
}

export interface Center {
  id: string
  name: string
  address: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  country_code: string | null
  state_name: string | null
  is_active: boolean
  created_at: string
}

export type BoxStatus = "DRAFT" | "SEALED" | "SHIPPED" | "REJECTED"
export type PalletStatus = "OPEN" | "CLOSED" | "SHIPPED"
export type ShipmentStatus = "OPEN" | "CLOSED" | "SHIPPED" | "DELIVERED" | "RECONCILED"

export interface ProductType {
  id: string
  category: ProductCategory
  display_name: string
  unspsc_code: string | null
  inn_name: string | null
  brand: string | null
  strength: string | null
  form: string | null
  gtin: string | null
  default_unit: string | null
  is_controlled: boolean
  min_shelf_life_days: number | null
  // Peso de una unidad. Con esto el intake pre-llena el estimado de la caja.
  unit_weight_kg: string | number | null
  created_at: string
}

export interface BoxOut {
  id: string
  code: string
  product_type_id: string
  quantity: number
  unit: string
  batch: string | null
  expiry_date: string | null
  weight_kg: string | null
  status: BoxStatus
  reject_reason: string | null
  created_at: string
}

export interface IntakeOut {
  id: string
  center_id: string
  campaign_id: string
  donante_libre: string | null   // legado, solo lectura
  donor?: Donor | null           // identificado, cuando lo hay
  notes: string | null
  created_at: string
  boxes: BoxOut[]
}

export interface EventOut {
  from_status: string | null
  to_status: string
  milestone?: string | null
  note: string | null
  ts: string
}

// Los siete hitos que el backend acepta (Fase 22).
export const SHIPMENT_MILESTONES = [
  "DEPARTED_WAREHOUSE",
  "ARRIVED_AIRPORT",
  "LOADED_AIRCRAFT",
  "DEPARTED_FLIGHT",
  "ARRIVED_DESTINATION",
  "CUSTOMS_CLEARED",
  "DELIVERED_CONSIGNEE",
] as const

export interface BoxPublicOut {
  code: string
  status: string
  category: string
  display_name: string
  quantity: number
  unit: string
  expiry_date: string | null
  sealed_at: string | null
}

export interface PalletOut {
  id: string
  code: string
  center_id: string
  shipment_id: string | null
  status: PalletStatus
  notes: string | null
  closed_at: string | null
  created_at: string
}

export interface PalletDetailOut extends PalletOut {
  boxes: BoxOut[]
  gross_weight_kg?: string | number | null
  tare_weight_kg?: string | number | null
  height_cm?: number | null
  // Suma de las cajas pesadas y su diferencia contra el neto de la tarima.
  boxes_weight_kg?: string | number | null
  weight_discrepancy_kg?: string | number | null
}

export interface PalletPublicOut {
  code: string
  status: PalletStatus
  center_name: string
  box_count: number
  closed_at: string | null
}

export interface ShipmentOut {
  id: string
  center_id: string | null
  destination: string
  carrier: string | null
  reference: string | null
  status: ShipmentStatus
  notes: string | null
  closed_at: string | null
  shipped_at: string | null
  delivered_at?: string | null
  reconciled_at?: string | null
  created_at: string
}

export interface ShipmentDetailOut extends ShipmentOut {
  pallets: PalletDetailOut[]
  height_profile?: string | null
  // Tarimas que no caben en el perfil declarado. Aviso, no bloqueo.
  height_warnings?: string[]
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export type TransferStatus = "REQUESTED" | "APPROVED" | "IN_TRANSIT" | "RECEIVED" | "REJECTED"

export interface TransferOut {
  id: string
  from_center_id: string
  to_center_id: string
  status: TransferStatus
  initiated_by: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface TransferEventOut {
  id: string
  transfer_id: string
  from_status: string | null
  to_status: string
  user_id: string | null
  note: string | null
  ts: string
}

export interface TransferDetailOut extends TransferOut {
  boxes: BoxOut[]
  events: TransferEventOut[]
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export type ThreadType = "PRIVATE" | "PUBLIC"

export interface AttachmentOut {
  id: string
  filename: string
  content_type: string
  size_bytes: number
  created_at: string
}

export interface ThreadReplyOut {
  id: string
  thread_id: string
  sender_id: string | null
  body: string
  created_at: string
  attachments: AttachmentOut[]
}

export interface ThreadOut {
  id: string
  title: string
  body: string
  sender_id: string | null
  campaign_id: string
  thread_type: ThreadType
  created_at: string
  updated_at: string
}

export interface ThreadDetailOut extends ThreadOut {
  replies: ThreadReplyOut[]
  attachments: AttachmentOut[]
  participant_ids: string[]
}

export interface UploadUrlOut {
  upload_url: string
  r2_key: string
}

// ── Aggregate / Dashboard ──────────────────────────────────────────────────────

export interface CategoryStockOut {
  category: string
  total_units: number
  box_count: number
}

export interface CenterStockOut {
  center_id: string
  center_name: string
  country_code: string | null
  state_name: string | null
  total_units: number
  box_count: number
}

export interface InnStockOut {
  inn_name: string | null
  strength: string | null
  form: string | null
  total_units: number
  box_count: number
}

export interface SummaryTotalsOut {
  total_boxes_sealed: number
  total_units_sealed: number
  total_weight_kg: number
  total_intakes: number
  total_shipments_sent: number
  active_centers: number
}

export interface NationalDashboardOut {
  totals: SummaryTotalsOut
  by_category: CategoryStockOut[]
  by_center: CenterStockOut[]
  by_inn: InnStockOut[]
}

export interface PublicNeedsOut {
  by_category: CategoryStockOut[]
}

/** Código de barras aprendido durante una captura y ligado a un tipo de producto. */
export interface ProductGtin {
  id: string
  gtin: string
  source: string
  created_at: string
}

/** Donante identificado (Fase 19). Sin bloque donante, la donación es anónima. */
export interface Donor {
  id: string
  donor_type: "fisica" | "moral"
  first_name: string
  last_name: string
  legal_name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

/** Lo que captura el formulario; se convierte a payload solo si el check está activo. */
export interface DonorDraft {
  donor_type: "fisica" | "moral"
  first_name: string
  last_name: string
  legal_name: string
  email: string
  phone: string
}

// ── Recepción en destino (Fase 22) ──────────────────────────────────────────

export type ReceptionOutcome = "RECEIVED" | "MISSING" | "DAMAGED" | "RETAINED_CUSTOMS"

export interface ReceptionLineOut {
  box_id: string
  outcome: ReceptionOutcome
  note: string | null
}

export interface ShrinkageOut {
  total_boxes: number
  received: number
  not_received: number
  shrinkage_pct: number
}

export interface ReceptionOut {
  id: string
  shipment_id: string
  received_at: string
  consignee_name: string | null
  notes: string | null
  lines: ReceptionLineOut[]
  pallet_weights: { pallet_id: string; gross_weight_kg: string | number }[]
  shrinkage: ShrinkageOut
}
