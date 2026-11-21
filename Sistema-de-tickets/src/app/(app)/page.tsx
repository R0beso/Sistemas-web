import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Inbox,
  Plus,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { StatusDonut, WeeklyBars } from "@/components/charts";
import { TicketTable } from "@/components/ticket-table";
import { Avatar, SectionHeading, StatCard, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/constants";
import { formatDuration, relativeTime, ticketCode } from "@/lib/format";
import { getDashboardData } from "@/lib/tickets";

const weekdayFormatter = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const longDateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const metadata = { title: "Panel" };

export default async function DashboardPage() {
  const user = await requireUser();
  const data = getDashboardData(user);
  const staff = isStaff(user.role);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = user.name.split(" ")[0];
  const today = longDateFormatter.format(new Date());
  const active = data.stats.open + data.stats.inProgress + data.stats.pending;
  const maxWorkload = Math.max(1, ...data.workload.map((item) => item.count));

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
            Panel de control
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {today} · Esto es lo que está pasando en tu mesa de ayuda.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/tickets" className="btn-secondary">
            Ver todos
          </Link>
          <Link href="/tickets/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Nuevo ticket
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tickets activos"
          value={active}
          hint={`${data.stats.open} abiertos · ${data.stats.inProgress} en progreso · ${data.stats.pending} en espera`}
          icon={<Inbox className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          label="Sin asignar"
          value={data.stats.unassigned}
          hint="Tickets activos esperando un agente"
          icon={<UserRound className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Urgentes"
          value={data.stats.urgent}
          hint="Prioridad urgente sin resolver"
          icon={<Flame className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Resueltos (7 días)"
          value={data.stats.resolvedThisWeek}
          hint={
            data.stats.avgResolutionMs
              ? `Tiempo medio de resolución: ${formatDuration(data.stats.avgResolutionMs)}`
              : "Aún no hay datos de resolución"
          }
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="card p-5 sm:p-6">
            <SectionHeading
              title="Actividad de la semana"
              description="Tickets creados en los últimos 7 días"
            />
            <div className="mt-5">
              <WeeklyBars
                data={data.last7Days.map((item) => ({
                  label: weekdayFormatter
                    .format(new Date(`${item.day}T12:00:00Z`))
                    .replace(".", ""),
                  value: item.count,
                }))}
              />
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="px-5 pb-4 pt-5 sm:px-6">
              <SectionHeading
                title="Tickets recientes"
                description={
                  staff ? "Últimas actualizaciones del equipo" : "Tus últimas solicitudes"
                }
                action={
                  <Link
                    href="/tickets"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-500"
                  >
                    Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
            </div>
            <TicketTable
              tickets={data.recentTickets}
              emptyAction={
                <Link href="/tickets/new" className="btn-primary btn-sm">
                  <Plus className="h-3.5 w-3.5" /> Crear ticket
                </Link>
              }
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <SectionHeading title="Tickets por estado" />
            <div className="mt-5">
              <StatusDonut data={data.statusCounts} />
            </div>
          </section>

          {staff ? (
            <section className="card p-5">
              <SectionHeading
                title="Carga del equipo"
                description="Tickets activos por agente"
                action={<Users className="h-4 w-4 text-slate-300" />}
              />
              {data.workload.length === 0 ? (
                <p className="mt-5 text-xs text-slate-500">
                  No hay tickets activos asignados en este momento.
                </p>
              ) : (
                <ul className="mt-5 space-y-3.5">
                  {data.workload.map((agent) => (
                    <li key={agent.id}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar name={agent.name} size="xs" />
                          <span className="truncate font-medium text-slate-600">{agent.name}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-slate-900">{agent.count}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${(agent.count / maxWorkload) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="card p-5">
              <SectionHeading
                title="Tus tickets"
                description="Seguimiento de tus solicitudes"
                action={<Inbox className="h-4 w-4 text-slate-300" />}
              />
              {data.myTickets.length === 0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">Todavía no has creado ningún ticket.</p>
                  <Link href="/tickets/new" className="btn-primary btn-sm mt-3">
                    <Plus className="h-3.5 w-3.5" /> Crear ticket
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {data.myTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="group flex items-start gap-3 py-2.5"
                      >
                        <span className="mt-0.5 font-mono text-[10px] text-slate-400">
                          {ticketCode(ticket.id)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                            {ticket.subject}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {relativeTime(ticket.updatedAt)}
                          </span>
                        </span>
                        <StatusBadge status={ticket.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="card p-5">
            <SectionHeading
              title="Actividad reciente"
              action={<Activity className="h-4 w-4 text-slate-300" />}
            />
            {data.recentActivity.length === 0 ? (
              <p className="mt-5 text-xs text-slate-500">Sin actividad registrada todavía.</p>
            ) : (
              <ul className="mt-4 space-y-3.5">
                {data.recentActivity.map((event) => (
                  <li key={event.id} className="flex gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        {event.actorName ? (
                          <span className="font-semibold text-slate-800">{event.actorName} </span>
                        ) : null}
                        {event.detail ?? "Actualizó el ticket"}
                        {" · "}
                        <Link
                          href={`/tickets/${event.ticketId}`}
                          className="font-mono text-[10px] font-semibold text-indigo-600 hover:underline"
                        >
                          {ticketCode(event.ticketId)}
                        </Link>
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        {event.ticketSubject} · {relativeTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
