const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatShortDateTime(value: string | Date): string {
  return shortDateTimeFormatter.format(new Date(value));
}

export function relativeTime(value: string | Date): string {
  const date = new Date(value).getTime();
  const diff = Date.now() - date;
  const minutes = Math.round(diff / 60_000);

  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  if (days < 30) return `hace ${Math.round(days / 7)} sem`;
  return formatDate(value);
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days} d ${restHours} h` : `${days} d`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_GRADIENTS: Array<[string, string]> = [
  ["#6366f1", "#8b5cf6"],
  ["#0ea5e9", "#06b6d4"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#ef4444", "#f43f5e"],
  ["#8b5cf6", "#d946ef"],
  ["#0f766e", "#22c55e"],
  ["#475569", "#64748b"],
];

export function avatarGradient(seed: string): { backgroundImage: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const [from, to] = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` };
}

export function ticketCode(id: number): string {
  return `TK-${String(id).padStart(4, "0")}`;
}

export function truncate(value: string, max = 90): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
