import { Inbox, MessageSquare, UserRound } from "lucide-react";
import Link from "next/link";
import { CATEGORY_META } from "@/lib/constants";
import { relativeTime, ticketCode } from "@/lib/format";
import type { TicketWithPeople } from "@/lib/types";
import { Avatar, EmptyState, PriorityBadge, StatusBadge } from "@/components/ui";

export function TicketTable({
  tickets,
  emptyAction,
  emptyDescription = "Cuando se cree un ticket aparecerá aquí con su estado y prioridad.",
}: {
  tickets: TicketWithPeople[];
  emptyAction?: React.ReactNode;
  emptyDescription?: string;
}) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-6 w-6" />}
        title="No hay tickets que mostrar"
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              <th className="px-5 py-3">Ticket</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Prioridad</th>
              <th className="px-3 py-3">Asignado</th>
              <th className="px-5 py-3 text-right">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="group transition hover:bg-slate-50/80">
                <td className="max-w-[380px] px-5 py-3.5">
                  <Link href={`/tickets/${ticket.id}`} className="block">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-medium text-slate-400">
                        {ticketCode(ticket.id)}
                      </span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        {CATEGORY_META[ticket.category].label}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-slate-800 transition group-hover:text-indigo-600">
                      {ticket.subject}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{ticket.requesterName}</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.commentCount}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3.5">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-3 py-3.5">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-3 py-3.5">
                  {ticket.assigneeName ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={ticket.assigneeName} size="xs" />
                      <span className="text-xs font-medium text-slate-600">
                        {ticket.assigneeName}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <UserRound className="h-3.5 w-3.5" /> Sin asignar
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                  <span
                    className="text-xs text-slate-500"
                    title={new Date(ticket.updatedAt).toLocaleString("es-ES")}
                  >
                    {relativeTime(ticket.updatedAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <Link href={`/tickets/${ticket.id}`} className="block px-4 py-4 active:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-medium text-slate-400">
                  {ticketCode(ticket.id)}
                </span>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-slate-800">
                {ticket.subject}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={ticket.priority} />
                <span className="text-[11px] text-slate-400">
                  {CATEGORY_META[ticket.category].label}
                </span>
                <span className="ml-auto text-[11px] text-slate-400">
                  {relativeTime(ticket.updatedAt)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                {ticket.assigneeName ? (
                  <>
                    <Avatar name={ticket.assigneeName} size="xs" />
                    <span>{ticket.assigneeName}</span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <UserRound className="h-3 w-3" /> Sin asignar
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-slate-400">
                  <MessageSquare className="h-3 w-3" /> {ticket.commentCount}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
