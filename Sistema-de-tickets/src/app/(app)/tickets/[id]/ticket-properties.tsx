"use client";

import { Check, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { updateTicketAction } from "@/actions/tickets";
import {
  CATEGORY_META,
  PRIORITY_META,
  STATUS_META,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";

export function TicketProperties({
  ticket,
  agents,
}: {
  ticket: {
    id: number;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    assigneeId: number | null;
  };
  agents: Array<{ id: number; name: string }>;
}) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [category, setCategory] = useState<TicketCategory>(ticket.category);
  const [assigneeId, setAssigneeId] = useState(
    ticket.assigneeId ? String(ticket.assigneeId) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setCategory(ticket.category);
    setAssigneeId(ticket.assigneeId ? String(ticket.assigneeId) : "");
  }, [ticket.status, ticket.priority, ticket.category, ticket.assigneeId]);

  const dirty =
    status !== ticket.status ||
    priority !== ticket.priority ||
    category !== ticket.category ||
    assigneeId !== (ticket.assigneeId ? String(ticket.assigneeId) : "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateTicketAction({
        ticketId: ticket.id,
        status,
        priority,
        category,
        assigneeId: assigneeId ? Number(assigneeId) : null,
      });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } else {
        setError(result.error ?? "No se pudieron guardar los cambios.");
      }
    });
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          Propiedades
        </h2>
        {saved ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 animate-fade">
            <Check className="h-3.5 w-3.5" /> Guardado
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        <div>
          <label htmlFor="prop-status" className="label">
            Estado
          </label>
          <select
            id="prop-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TicketStatus)}
            className="select"
          >
            {TICKET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_META[value].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prop-priority" className="label">
            Prioridad
          </label>
          <select
            id="prop-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TicketPriority)}
            className="select"
          >
            {TICKET_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_META[value].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prop-category" className="label">
            Categoría
          </label>
          <select
            id="prop-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as TicketCategory)}
            className="select"
          >
            {TICKET_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_META[value].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prop-assignee" className="label">
            Asignado a
          </label>
          <select
            id="prop-assignee"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="select"
          >
            <option value="">Sin asignar</option>
            {agents.map((agent) => (
              <option key={agent.id} value={String(agent.id)}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!dirty || pending}
          className="btn-primary btn-sm w-full"
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" /> Guardar cambios
            </>
          )}
        </button>
      </form>
    </section>
  );
}
