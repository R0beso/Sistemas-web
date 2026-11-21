"use client";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { useActionState, useState } from "react";
import { loginAction } from "@/actions/auth";

const DEMO_ACCOUNTS = [
  {
    label: "Administrador",
    email: "admin@helpdesk.dev",
    password: "admin123",
    icon: ShieldCheck,
    tone: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  {
    label: "Agente",
    email: "carlos@helpdesk.dev",
    password: "agente123",
    icon: Headphones,
    tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  {
    label: "Cliente",
    email: "cliente@helpdesk.dev",
    password: "cliente123",
    icon: UserIcon,
    tone: "bg-sky-50 text-sky-600 ring-sky-100",
  },
];

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        {state.error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 animate-fade"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="label">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="label mb-0">
              Contraseña
            </label>
            <span className="text-[11px] text-slate-400">Demo: admin123</span>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
        </div>

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Comprobando…
            </>
          ) : (
            <>
              Entrar <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Acceso rápido de demostración
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-2">
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = account.icon;
          return (
            <form key={account.email} action={formAction}>
              <input type="hidden" name="email" value={account.email} />
              <input type="hidden" name="password" value={account.password} />
              <button
                type="submit"
                disabled={pending}
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md disabled:opacity-60"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${account.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-800">
                    Entrar como {account.label.toLowerCase()}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {account.email}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </button>
            </form>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Contraseñas cifradas con scrypt y sesiones firmadas
      </p>
    </div>
  );
}
