import { LifeBuoy, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f7fb] px-6 py-16 text-center">
      <Link href="/" className="mb-10 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <span className="text-left">
          <span className="block text-sm font-bold tracking-tight text-slate-900">
            Mesa de Ayuda
          </span>
          <span className="block text-[11px] text-slate-500">Sistema de tickets</span>
        </span>
      </Link>

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm ring-1 ring-slate-200">
        <SearchX className="h-7 w-7" />
      </div>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">
        Error 404
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        No encontramos esta página
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Puede que el ticket ya no exista, que no tengas permisos para verlo o que la dirección
        sea incorrecta.
      </p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Link href="/" className="btn-primary">
          Volver al panel
        </Link>
        <Link href="/tickets" className="btn-secondary">
          Ver tickets
        </Link>
      </div>
    </div>
  );
}
