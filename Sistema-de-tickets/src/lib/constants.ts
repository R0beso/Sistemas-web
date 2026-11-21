export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING",
  "RESOLVED",
  "CLOSED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const STATUS_META: Record<
  TicketStatus,
  { label: string; badge: string; dot: string; color: string; description: string }
> = {
  OPEN: {
    label: "Abierto",
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
    color: "#0ea5e9",
    description: "Sin atender todavía",
  },
  IN_PROGRESS: {
    label: "En progreso",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    color: "#f59e0b",
    description: "Alguien está trabajando en ello",
  },
  PENDING: {
    label: "En espera",
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    dot: "bg-violet-500",
    color: "#8b5cf6",
    description: "Esperando respuesta del cliente",
  },
  RESOLVED: {
    label: "Resuelto",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    color: "#10b981",
    description: "Solucionado, pendiente de cierre",
  },
  CLOSED: {
    label: "Cerrado",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
    color: "#94a3b8",
    description: "Ticket finalizado",
  },
};

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const PRIORITY_META: Record<
  TicketPriority,
  { label: string; badge: string; dot: string; color: string; weight: number }
> = {
  LOW: {
    label: "Baja",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
    color: "#94a3b8",
    weight: 1,
  },
  MEDIUM: {
    label: "Media",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
    color: "#3b82f6",
    weight: 2,
  },
  HIGH: {
    label: "Alta",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
    color: "#f97316",
    weight: 3,
  },
  URGENT: {
    label: "Urgente",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    color: "#ef4444",
    weight: 4,
  },
};

export const TICKET_CATEGORIES = [
  "HARDWARE",
  "SOFTWARE",
  "RED",
  "ACCESO",
  "FACTURACION",
  "OTRO",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const CATEGORY_META: Record<TicketCategory, { label: string; icon: string }> = {
  HARDWARE: { label: "Hardware", icon: "🖥️" },
  SOFTWARE: { label: "Software", icon: "💾" },
  RED: { label: "Red y conectividad", icon: "🌐" },
  ACCESO: { label: "Accesos y cuentas", icon: "🔐" },
  FACTURACION: { label: "Facturación", icon: "🧾" },
  OTRO: { label: "Otro", icon: "📌" },
};

export const USER_ROLES = ["ADMIN", "AGENT", "CLIENT"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_META: Record<UserRole, { label: string; badge: string }> = {
  ADMIN: { label: "Administrador", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  AGENT: { label: "Agente", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CLIENT: { label: "Cliente", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export const PAGE_SIZE = 10;

export const ACTIVE_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "PENDING"];

export const isStaff = (role: UserRole) => role === "ADMIN" || role === "AGENT";
