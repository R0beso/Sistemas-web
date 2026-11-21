"use client";

import {
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/actions/auth";
import { Avatar } from "@/components/ui";
import { ROLE_META } from "@/lib/constants";
import type { User } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Inbox;
  adminOnly?: boolean;
  accent?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Inbox },
  { href: "/tickets/new", label: "Nuevo ticket", icon: Plus, accent: true },
  { href: "/users", label: "Usuarios", icon: Users, adminOnly: true },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/tickets/new") return pathname === "/tickets/new";
  if (href === "/tickets") {
    return pathname === "/tickets" || (pathname.startsWith("/tickets/") && pathname !== "/tickets/new");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
}: {
  user: User;
  pathname: string;
  onNavigate?: () => void;
}) {
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");

  return (
    <div className="flex h-full flex-col bg-slate-950 px-4 py-5">
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-7 flex items-center gap-3 rounded-xl px-2 py-1"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/40">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-bold tracking-tight text-white">Mesa de Ayuda</span>
          <span className="block text-[11px] font-medium text-slate-500">Sistema de tickets</span>
        </span>
      </Link>

      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        General
      </p>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = item.icon;

          if (item.accent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-indigo-500/10 text-indigo-200 ring-1 ring-inset ring-indigo-400/20 hover:bg-indigo-500/20 hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-inset ring-white/10"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] ${
                  active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 pt-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Sistema operativo
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            Base de datos local SQLite. Todos los datos se guardan en tu equipo.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
          <Avatar name={user.name} size="sm" className="ring-slate-950" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user.name}</p>
            <p className="truncate text-[10px] text-slate-400">{ROLE_META[user.role].label}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <ShieldCheck className="h-3 w-3" /> Sesión protegida · v1.0
        </p>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-slide-in">
            <SidebarContent user={user} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <LifeBuoy className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold tracking-tight text-slate-900">Mesa de Ayuda</span>
            </Link>
          </div>
          <Avatar name={user.name} size="sm" />
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
