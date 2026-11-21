import { Plus } from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { TicketTable } from "@/components/ticket-table";
import { requireUser } from "@/lib/auth";
import {
  PAGE_SIZE,
  STATUS_META,
  TICKET_STATUSES,
  isStaff,
  type TicketStatus,
} from "@/lib/constants";
import { getStatusCounts, listTickets } from "@/lib/tickets";
import { listAssignableUsers } from "@/lib/users";
import { TicketFilters } from "./filters";

export const metadata = { title: "Tickets" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TicketsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const staff = isStaff(user.role);
  const params = await searchParams;

  const current = {
    q: readParam(params, "q")?.trim() || undefined,
    status: readParam(params, "status") || undefined,
    priority: readParam(params, "priority") || undefined,
    assignee: readParam(params, "assignee") || undefined,
    category: readParam(params, "category") || undefined,
  };

  const pageParam = Number(readParam(params, "page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const result = listTickets(user, { ...current, page });
  const counts = getStatusCounts(user);
  const totalAll = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const agents = staff ? listAssignableUsers().map(({ id, name }) => ({ id, name })) : [];

  function tabHref(status?: TicketStatus): string {
    const search = new URLSearchParams();
    if (current.q) search.set("q", current.q);
    if (status) search.set("status", status);
    if (current.priority) search.set("priority", current.priority);
    if (current.assignee) search.set("assignee", current.assignee);
    if (current.category) search.set("category", current.category);
    const query = search.toString();
    return query ? `/tickets?${query}` : "/tickets";
  }

  const tabs: Array<{ value?: TicketStatus; label: string; count: number }> = [
    { value: undefined, label: "Todos", count: totalAll },
    ...TICKET_STATUSES.map((status) => ({
      value: status,
      label: STATUS_META[status].label,
      count: counts[status],
    })),
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
            Mesa de ayuda
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {staff ? "Todos los tickets" : "Mis tickets"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalAll} {totalAll === 1 ? "ticket registrado" : "tickets registrados"}
            {result.total !== totalAll
              ? ` · ${result.total} ${result.total === 1 ? "resultado" : "resultados"} con los filtros actuales`
              : ""}
          </p>
        </div>
        <Link href="/tickets/new" className="btn-primary shrink-0 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Nuevo ticket
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-3 pt-3 sm:px-4">
          <nav
            aria-label="Filtrar por estado"
            className="scrollbar-none flex gap-1 overflow-x-auto pb-2"
          >
            {tabs.map((tab) => {
              const active = current.status === tab.value;
              return (
                <Link
                  key={tab.label}
                  href={tabHref(tab.value)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {tab.value ? (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-white/80" : STATUS_META[tab.value].dot
                      }`}
                    />
                  ) : null}
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-3">
          <TicketFilters current={current} agents={agents} isStaff={staff} />
        </div>

        <TicketTable
          tickets={result.tickets}
          emptyDescription={
            current.q || current.status || current.priority || current.assignee || current.category
              ? "Prueba a cambiar los filtros o la búsqueda para encontrar lo que buscas."
              : staff
                ? "Cuando alguien cree un ticket aparecerá aquí con su estado y prioridad."
                : "Cuando crees un ticket aparecerá aquí con su estado y prioridad."
          }
          emptyAction={
            <Link href="/tickets/new" className="btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" /> Crear ticket
            </Link>
          }
        />

        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={PAGE_SIZE}
          basePath="/tickets"
          params={current}
        />
      </div>
    </div>
  );
}
