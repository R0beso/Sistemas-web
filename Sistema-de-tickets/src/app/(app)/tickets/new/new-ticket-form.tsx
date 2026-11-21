"use client";

import { AlertCircle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createTicketAction } from "@/actions/tickets";
import {
  CATEGORY_META,
  PRIORITY_META,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/constants";

const PRIORITY_HELP: Record<TicketPriority, string> = {
  LOW: "Puede esperar sin bloquear el trabajo.",
  MEDIUM: "Afecta a mi trabajo pero tengo alternativa.",
  HIGH: "Bloquea tareas importantes del equipo.",
  URGENT: "Servicio caído, pérdida de datos o impacto crítico.",
};

export function NewTicketForm({
  isStaff,
  agents,
  requesters,
  currentUserId,
}: {
  isStaff: boolean;
  agents: Array<{ id: number; name: string }>;
  requesters: Array<{ id: number; name: string; role: string }>;
  currentUserId: number;
}) {
  const [state, formAction, pending] = useActionState(createTicketAction, {});
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("SOFTWARE");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [requesterId, setRequesterId] = useState(String(currentUserId));
  const [assigneeId, setAssigneeId] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="card space-y-5 p-5 sm:p-6">
        <div>
          <label htmlFor="subject" className="label">
            Asunto <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            name="subject"
            required
            maxLength={160}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Ej. No puedo acceder al portal de clientes"
            className="input"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Un título claro ayuda a resolverlo más rápido. Máximo 160 caracteres.
          </p>
        </div>

        <div>
          <label htmlFor="description" className="label">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={7}
            maxLength={8000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Cuéntanos qué ocurre, desde cuándo, a quién afecta y qué has intentado hasta ahora…"
            className="textarea"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Incluye los pasos para reproducir el problema si es posible.</span>
            <span>{description.length}/8000</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="label">
              Categoría
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value as TicketCategory)}
              className="select"
            >
              {TICKET_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_META[value].icon} {CATEGORY_META[value].label}
                </option>
              ))}
            </select>
          </div>

          {isStaff ? (
            <div>
              <label htmlFor="requesterId" className="label">
                Solicitante
              </label>
              <select
                id="requesterId"
                name="requesterId"
                value={requesterId}
                onChange={(event) => setRequesterId(event.target.value)}
                className="select"
              >
                {requesters.map((person) => (
                  <option key={person.id} value={String(person.id)}>
                    {person.name}
                    {person.role === "CLIENT" ? " · Cliente" : person.role === "AGENT" ? " · Agente" : " · Admin"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {isStaff ? (
            <div>
              <label htmlFor="assigneeId" className="label">
                Asignar a
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
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
          ) : null}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="label mb-0">Prioridad</span>
          <span className="text-[11px] text-slate-400">Selecciona el impacto real</span>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {TICKET_PRIORITIES.map((value) => {
            const meta = PRIORITY_META[value];
            const selected = priority === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                  selected
                    ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={value}
                  checked={selected}
                  onChange={() => setPriority(value)}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                    {PRIORITY_HELP[value]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
        <Link href="/tickets" className="btn-secondary">
          Cancelar
        </Link>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creando ticket…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Crear ticket
            </>
          )}
        </button>
      </div>
    </form>
  );
}
