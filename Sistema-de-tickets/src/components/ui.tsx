import type { ReactNode } from "react";
import {
  PRIORITY_META,
  ROLE_META,
  STATUS_META,
  type TicketPriority,
  type TicketStatus,
  type UserRole,
} from "@/lib/constants";
import { avatarGradient, initials } from "@/lib/format";

const AVATAR_SIZES = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-lg",
} as const;

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={avatarGradient(name)}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold uppercase tracking-wide text-white ring-2 ring-white ${AVATAR_SIZES[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`chip ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={meta.badge}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <Badge className={meta.badge}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const meta = ROLE_META[role];
  return <Badge className={meta.badge}>{meta.label}</Badge>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "indigo",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: "indigo" | "amber" | "red" | "emerald" | "slate";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-500",
  } as const;

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
