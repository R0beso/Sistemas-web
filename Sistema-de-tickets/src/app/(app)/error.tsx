"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
        Algo ha salido mal
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        No pudimos cargar esta sección. Inténtalo de nuevo; si el problema continúa, revisa la
        consola del servidor.
      </p>
      {error.digest ? (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-[10px] text-slate-500">
          Referencia: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={reset} className="btn-primary">
          <RotateCcw className="h-4 w-4" /> Reintentar
        </button>
        <Link href="/" className="btn-secondary">
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
