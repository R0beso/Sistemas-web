"use client";

import { Check, Loader2, Lock, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { addCommentAction } from "@/actions/tickets";
import { Avatar } from "@/components/ui";
import { Toast } from "@/components/toast";

export function CommentForm({
  ticketId,
  isStaff,
  authorName,
}: {
  ticketId: number;
  isStaff: boolean;
  authorName: string;
}) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (text.length < 2) {
      setError("Escribe un mensaje antes de enviar.");
      return;
    }
    setError(null);
    setPublished(false);
    startTransition(async () => {
      const result = await addCommentAction({ ticketId, body: text, internal });
      if (result.ok) {
        setBody("");
        setInternal(false);
        setPublished(true);
        setTimeout(() => setPublished(false), 3500);
      } else {
        setError(result.error ?? "No se pudo publicar el mensaje.");
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <Avatar name={authorName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800">Responder</p>
            <p className="text-[11px] text-slate-400">
              {internal
                ? "Esta nota solo será visible para el equipo de soporte."
                : "Tu mensaje se añadirá a la conversación del ticket."}
            </p>
          </div>

          {isStaff ? (
            <label
              className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                internal
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={internal}
                onChange={(event) => setInternal(event.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Lock className="h-3 w-3" />
              Nota interna
            </label>
          ) : null}
        </div>

        <div className="p-4">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={4}
            maxLength={5000}
            placeholder={
              internal
                ? "Escribe una nota visible solo para el equipo…"
                : "Escribe una respuesta para el solicitante…"
            }
            className={`textarea ${
              internal
                ? "border-amber-200 bg-amber-50/50 focus:border-amber-400 focus:ring-amber-500/10"
                : ""
            }`}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>{body.length}/5000</span>
              <span className="hidden items-center gap-1 sm:flex">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-semibold text-slate-500">
                  Ctrl
                </kbd>
                +
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-semibold text-slate-500">
                  Enter
                </kbd>
                para enviar
              </span>
              {published ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-600 animate-fade">
                  <Check className="h-3.5 w-3.5" /> Publicado
                </span>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={pending || body.trim().length < 2}
              className="btn-primary btn-sm"
            >
              {pending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {internal ? "Guardar nota" : "Enviar respuesta"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {error ? <Toast message={error} onClose={() => setError(null)} /> : null}
    </>
  );
}
