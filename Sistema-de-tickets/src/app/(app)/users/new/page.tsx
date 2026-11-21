import { ArrowLeft, KeyRound, Mail, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CreateUserForm } from "./create-user-form";

export const metadata = { title: "Nuevo usuario" };

export default async function NewUserPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in">
      <div>
        <Link
          href="/users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a usuarios
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Crear un nuevo usuario
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Añade a una persona al equipo o da acceso al portal de clientes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <CreateUserForm />

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              Antes de crear la cuenta
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-500">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                Verifica que el correo no esté ya registrado.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                Elige el rol según el acceso que necesite la persona.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                Usa una contraseña temporal segura y compártela por un canal privado.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                Puedes desactivar el acceso en cualquier momento desde la lista de usuarios.
              </li>
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-slate-400" />
              Seguridad
            </h2>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Las contraseñas se almacenan con hash scrypt y nunca se guardan en texto plano. Al
              restablecer una contraseña se cierran todas las sesiones de esa persona.
            </p>
          </section>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <UserPlus className="h-4 w-4" /> Acceso inmediato
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-700/80">
              El usuario podrá iniciar sesión en cuanto crees la cuenta, con el correo y la
              contraseña que definas aquí.
            </p>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <Mail className="h-3 w-3" />
            No se envían correos automáticos
          </p>
        </aside>
      </div>
    </div>
  );
}
