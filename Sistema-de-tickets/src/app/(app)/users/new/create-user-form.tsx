"use client";

import {
  AlertCircle,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createUserAction } from "@/actions/users";
import { ROLE_META, USER_ROLES, type UserRole } from "@/lib/constants";

const ROLE_INFO: Record<
  UserRole,
  { description: string; icon: typeof ShieldCheck; tone: string }
> = {
  ADMIN: {
    description: "Acceso completo. Gestiona usuarios, roles y todos los tickets.",
    icon: ShieldCheck,
    tone: "text-indigo-600 bg-indigo-50 ring-indigo-100",
  },
  AGENT: {
    description: "Atiende y asigna cualquier ticket. Puede escribir notas internas.",
    icon: Headphones,
    tone: "text-emerald-600 bg-emerald-50 ring-emerald-100",
  },
  CLIENT: {
    description: "Crea tickets y sigue únicamente sus propias solicitudes.",
    icon: UserRound,
    tone: "text-sky-600 bg-sky-50 ring-sky-100",
  },
};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, {});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("AGENT");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="card space-y-5 p-5 sm:p-6">
        <div>
          <label htmlFor="name" className="label">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Laura Martín"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Correo electrónico <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={160}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="persona@empresa.com"
            className="input"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Se usará para iniciar sesión. Debe ser único.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="label mb-0">
              Contraseña inicial <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Mínimo 8 caracteres</span>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Comparte la contraseña con la persona por un canal seguro. Podrá cambiarla después.
          </p>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <span className="label mb-0">Rol del usuario</span>
        <div className="mt-3 space-y-2.5">
          {USER_ROLES.map((value) => {
            const info = ROLE_INFO[value];
            const Icon = info.icon;
            const selected = role === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                  selected
                    ? "border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={selected}
                  onChange={() => setRole(value)}
                  className="mt-1 h-4 w-4"
                />
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${info.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800">
                    {ROLE_META[value].label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                    {info.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
        <Link href="/users" className="btn-secondary">
          Cancelar
        </Link>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creando usuario…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Crear usuario
            </>
          )}
        </button>
      </div>
    </form>
  );
}
