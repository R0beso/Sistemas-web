import { ArrowLeft, CheckCircle2, Clock3, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/constants";
import { listActiveUsers, listAssignableUsers } from "@/lib/users";
import { NewTicketForm } from "./new-ticket-form";

export const metadata = { title: "Nuevo ticket" };

export default async function NewTicketPage() {
  const user = await requireUser();
  const staff = isStaff(user.role);

  const agents = staff ? listAssignableUsers().map(({ id, name }) => ({ id, name })) : [];
  const requesters = staff
    ? listActiveUsers().map(({ id, name, role }) => ({ id, name, role }))
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in">
      <div>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a tickets
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Crear un nuevo ticket
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Cuéntanos qué necesitas y lo dirigiremos al agente adecuado.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <NewTicketForm
          isStaff={staff}
          agents={agents}
          requesters={requesters}
          currentUserId={user.id}
        />

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Un buen ticket incluye
            </h2>
            <ul className="mt-3 space-y-2.5">
              {[
                "Qué estabas intentando hacer.",
                "Desde cuándo ocurre y con qué frecuencia.",
                "A quién más le afecta.",
                "Mensajes de error o capturas de pantalla.",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-500">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock3 className="h-4 w-4 text-indigo-500" />
              Qué ocurre después
            </h2>
            <ol className="mt-3 space-y-3">
              {[
                { title: "Recibimos tu solicitud", text: "Queda registrada con un número de ticket." },
                { title: "Un agente la revisa", text: "Se asigna según categoría y carga de trabajo." },
                { title: "Seguimiento aquí", text: "Recibirás las respuestas en la conversación." },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 ring-1 ring-inset ring-indigo-100">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-slate-700">{step.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                      {step.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-indigo-800">
              <ShieldCheck className="h-4 w-4" /> Tus datos están seguros
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-indigo-700/80">
              La información se guarda en la base de datos local del sistema y solo es visible
              para ti y el equipo de soporte.
            </p>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <MessageSquare className="h-3 w-3" />
            Recibirás novedades en el hilo del ticket
          </p>
        </aside>
      </div>
    </div>
  );
}
