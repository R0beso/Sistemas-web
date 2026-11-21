"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toggleUserActiveAction } from "@/actions/users";
import { Toast } from "@/components/toast";

export function UserActiveToggle({
  userId,
  active,
  isSelf,
}: {
  userId: number;
  active: boolean;
  isSelf: boolean;
}) {
  const [value, setValue] = useState(active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(active);
  }, [active]);

  function toggle() {
    if (isSelf) {
      setError("No puedes desactivar tu propia cuenta.");
      return;
    }
    const next = !value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleUserActiveAction({ userId, active: next });
      if (!result.ok) {
        setValue(!next);
        setError(result.error ?? "No se pudo actualizar el estado.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={value ? "Desactivar usuario" : "Activar usuario"}
          onClick={toggle}
          disabled={pending || isSelf}
          title={isSelf ? "No puedes desactivar tu propia cuenta" : undefined}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
            value ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`flex items-center gap-1 text-[11px] font-medium ${
            value ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {value ? "Activo" : "Inactivo"}
        </span>
      </div>
      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
