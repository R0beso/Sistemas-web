"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface FilterValues {
  q?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  category?: string;
}

export function TicketFilters({
  current,
  agents,
  isStaff,
}: {
  current: FilterValues;
  agents: Array<{ id: number; name: string }>;
  isStaff: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(current.q ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setQ(current.q ?? "");
  }, [current.q]);

  function navigate(updates: Partial<FilterValues>) {
    const next = { ...current, ...updates };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
    }
    const query = search.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  const hasFilters = Boolean(
    current.q || current.status || current.priority || current.assignee || current.category,
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ q: q.trim() || undefined });
        }}
        className="relative min-w-0 flex-1"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar por asunto, descripción o número de ticket…"
          aria-label="Buscar tickets"
          className="input pl-10 pr-10"
        />
        {pending ? (
          <span className="absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        ) : q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              navigate({ q: undefined });
            }}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 sm:flex">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtrar
        </span>

        <select
          aria-label="Filtrar por prioridad"
          value={current.priority ?? ""}
          onChange={(event) => navigate({ priority: event.target.value || undefined })}
          className="select w-auto min-w-[130px] py-2 text-xs"
        >
          <option value="">Todas las prioridades</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="URGENT">Urgente</option>
        </select>

        <select
          aria-label="Filtrar por categoría"
          value={current.category ?? ""}
          onChange={(event) => navigate({ category: event.target.value || undefined })}
          className="select w-auto min-w-[130px] py-2 text-xs"
        >
          <option value="">Todas las categorías</option>
          <option value="HARDWARE">Hardware</option>
          <option value="SOFTWARE">Software</option>
          <option value="RED">Red y conectividad</option>
          <option value="ACCESO">Accesos y cuentas</option>
          <option value="FACTURACION">Facturación</option>
          <option value="OTRO">Otro</option>
        </select>

        {isStaff ? (
          <select
            aria-label="Filtrar por asignación"
            value={current.assignee ?? ""}
            onChange={(event) => navigate({ assignee: event.target.value || undefined })}
            className="select w-auto min-w-[150px] py-2 text-xs"
          >
            <option value="">Cualquier asignación</option>
            <option value="me">Asignados a mí</option>
            <option value="unassigned">Sin asignar</option>
            {agents.map((agent) => (
              <option key={agent.id} value={String(agent.id)}>
                {agent.name}
              </option>
            ))}
          </select>
        ) : null}

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => {
                router.push(pathname);
              });
            }}
            className="btn-ghost btn-sm text-slate-500"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        ) : null}
      </div>
    </div>
  );
}
