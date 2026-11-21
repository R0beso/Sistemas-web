"use client";

import { Archive, CheckCircle2, Loader2, RotateCcw, UserMinus, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { quickActionAction } from "@/actions/tickets";
import { Toast } from "@/components/toast";

type QuickAction = "assign_me" | "resolve" | "close" | "reopen" | "unassign";

export function QuickActions({
  ticketId,
  status,
  assigneeId,
  currentUserId,
}: {
  ticketId: number;
  status: string;
  assigneeId: number | null;
  currentUserId: number;
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<QuickAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: QuickAction) {
    setError(null);
    setActive(action);
    startTransition(async () => {
      const result = await quickActionAction({ ticketId, action });
      setActive(null);
      if (!result.ok) setError(result.error ?? "No se pudo completar la acción.");
    });
  }

  const closed = status === "CLOSED";
  const resolved = status === "RESOLVED";
  const mine = assigneeId === currentUserId;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!mine && !closed ? (
          <button
            type="button"
            onClick={() => run("assign_me")}
            disabled={pending}
            className="btn-secondary btn-sm"
          >
            {active === "assign_me" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            Tomar ticket
          </button>
        ) : null}

        {!closed && !resolved ? (
          <button
            type="button"
            onClick={() => run("resolve")}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {active === "resolve" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Resolver
          </button>
        ) : null}

        {!closed ? (
          <button
            type="button"
            onClick={() => run("close")}
            disabled={pending}
            className="btn-secondary btn-sm"
          >
            {active === "close" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            Cerrar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => run("reopen")}
            disabled={pending}
            className="btn-secondary btn-sm"
          >
            {active === "reopen" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reabrir
          </button>
        )}

        {mine ? (
          <button
            type="button"
            onClick={() => run("unassign")}
            disabled={pending}
            title="Quitar asignación"
            aria-label="Quitar asignación"
            className="btn-ghost btn-sm"
          >
            {active === "unassign" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserMinus className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>

      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
