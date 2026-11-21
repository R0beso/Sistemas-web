import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-1/4 top-10 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950/50">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
              <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
              <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
              <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight">Mesa de Ayuda</p>
            <p className="text-[11px] font-medium text-slate-400">Sistema de tickets</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Helpdesk listo para usar
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Soporte que no se pierde entre correos.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            Centraliza incidencias, prioriza lo urgente y da seguimiento a cada conversación
            desde un único lugar.
          </p>

          <ul className="mt-9 space-y-4">
            {[
              {
                title: "Prioriza lo que importa",
                text: "Estados, prioridades y categorías para que nada urgente pase desapercibido.",
              },
              {
                title: "Asigna y da seguimiento",
                text: "Agentes con carga visible y un historial completo de cada cambio.",
              },
              {
                title: "Conversaciones con contexto",
                text: "Respuestas públicas y notas internas separadas para tu equipo.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-400/20">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-6 text-[11px] text-slate-500">
          <span>Datos guardados localmente con SQLite</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> v1.0
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-[#f6f7fb] px-5 py-10 sm:px-8">
        <div className="absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Entorno de demostración
        </div>
        <div className="w-full max-w-[420px] animate-in">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
                <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
                <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
                <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Mesa de Ayuda</p>
              <p className="text-[11px] text-slate-500">Sistema de tickets</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Bienvenido de nuevo
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Inicia sesión para gestionar tus tickets de soporte.
          </p>

          <div className="mt-7">
            <LoginForm />
          </div>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-400">
            Al continuar aceptas el uso de cookies de sesión necesarias para mantener tu
            sesión activa.
          </p>
        </div>
      </div>
    </div>
  );
}
