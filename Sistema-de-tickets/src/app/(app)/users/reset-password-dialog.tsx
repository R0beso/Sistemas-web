"use client";

import { KeyRound, Loader2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { resetPasswordAction } from "@/actions/users";
import { Toast } from "@/components/toast";

export function ResetPasswordDialog({
  userId,
  userName,
}: {
  userId: number;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
    setPassword("");
    setConfirm("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordAction({ userId, password });
      if (result.ok) {
        close();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4500);
      } else {
        setError(result.error ?? "No se pudo actualizar la contraseña.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Restablecer contraseña de ${userName}`}
        aria-label={`Restablecer contraseña de ${userName}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <KeyRound className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-title"
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="reset-password-title"
                  className="flex items-center gap-2 text-sm font-bold text-slate-900"
                >
                  <KeyRound className="h-4 w-4 text-indigo-500" />
                  Restablecer contraseña
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Se asignará una nueva contraseña a{" "}
                  <span className="font-semibold text-slate-700">{userName}</span> y se cerrarán
                  sus sesiones activas.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor={`new-password-${userId}`} className="label">
                  Nueva contraseña
                </label>
                <input
                  id={`new-password-${userId}`}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor={`confirm-password-${userId}`} className="label">
                  Confirmar contraseña
                </label>
                <input
                  id={`confirm-password-${userId}`}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repite la contraseña"
                  className="input"
                />
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={close} className="btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={pending} className="btn-primary btn-sm">
                  {pending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {success ? (
        <Toast
          message={`Contraseña actualizada para ${userName}.`}
          tone="success"
          onClose={() => setSuccess(false)}
        />
      ) : null}
    </>
  );
}
