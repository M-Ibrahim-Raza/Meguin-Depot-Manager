export const PRODUCT_CATEGORIES = [
  "Engine Oil",
  "Gear Oil",
  "Transmission",
  "Grease",
  "Hydraulic",
  "Other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CUSTOMER_STATUSES = [
  "clear",
  "active",
  "warning",
  "overlimit",
] as const;
export type CustomerStatusKey = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatusKey, string> = {
  clear: "Clear",
  active: "Active",
  warning: "Warning",
  overlimit: "Over Limit",
};

export const PAYMENT_METHODS = ["cash", "bank", "cheque", "online"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank: "Bank Transfer",
  cheque: "Cheque",
  online: "Online",
};

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

export const BILL_TYPES = ["cash", "deferred", "mixed"] as const;
export type BillType = (typeof BILL_TYPES)[number];

export const BILL_STATUSES = [
  "paid",
  "unpaid",
  "pending_approval",
  "rejected",
] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  pending_approval: "Pending Approval",
  rejected: "Rejected",
};

export type BusinessInfo = {
  name: string;
};

// Business identity printed on every bill copy. Editing here updates all three
// copies (Office/Stock/Receiving).
export const BUSINESS_INFO: BusinessInfo = {
  name: "PREMIUM INDUSTRIES",
};

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number] | (string & {});

export const USER_ROLE_LABELS: Record<(typeof USER_ROLES)[number], string> = {
  admin: "Admin",
  user: "User",
};

export const USER_STATUSES = ["active", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

// The two physical places stock lives. A fixed set — not a configurable table —
// reused as the source of truth by the schema enums, Zod validators, and UI.
export const STOCK_LOCATIONS = ["warehouse", "office"] as const;
export type StockLocation = (typeof STOCK_LOCATIONS)[number];

export const STOCK_LOCATION_LABELS: Record<StockLocation, string> = {
  warehouse: "Warehouse",
  office: "Office",
};

// Movement kinds are defined on the `stock_movement` schema (the DB enum is the
// source of truth); labels live here so the UI badge and the export column can
// both reuse them without duplicating strings.
export const STOCK_MOVEMENT_KIND_LABELS: Record<
  import("@/server/db/schema").StockMovementKind,
  string
> = {
  opening: "Opening",
  addition: "Added",
  adjustment: "Adjusted",
  sale: "Sale",
  return: "Return",
  transfer_out: "Transfer out",
  transfer_in: "Transfer in",
};

// The depot's fixed local timezone (Pakistan, UTC+5, no DST). Calendar-day
// boundaries for date-range filters are computed in this zone so "today" means
// the depot's day regardless of where the server runs or a user's browser is.
// See src/lib/date-range.ts.
export const APP_TIMEZONE = "Asia/Karachi";
