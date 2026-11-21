import { Headphones, Plus, ShieldCheck, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, RoleBadge, SectionHeading, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/users";
import { UserActiveToggle } from "./active-toggle";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserRoleSelect } from "./role-select";

export const metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const currentUser = await requireAdmin();
  const users = listUsers();

  const admins = users.filter((user) => user.role === "ADMIN");
  const agents = users.filter((user) => user.role === "AGENT");
  const clients = users.filter((user) => user.role === "CLIENT");
  const activeCount = users.filter((user) => user.active).length;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-indigo-600">
            Administración
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Usuarios y roles
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {users.length} {users.length === 1 ? "persona registrada" : "personas registradas"} ·{" "}
            {activeCount} {activeCount === 1 ? "activa" : "activas"}
          </p>
        </div>
        <Link href="/users/new" className="btn-primary shrink-0 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Usuarios"
          value={users.length}
          hint={`${activeCount} activos · ${users.length - activeCount} inactivos`}
          icon={<Users className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          label="Administradores"
          value={admins.length}
          hint="Acceso total y gestión de usuarios"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="slate"
        />
        <StatCard
          label="Agentes"
          value={agents.length}
          hint="Ven y atienden todos los tickets"
          icon={<Headphones className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Clientes"
          value={clients.length}
          hint="Solo ven sus propias solicitudes"
          icon={<UserRound className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[11px] leading-relaxed text-indigo-800">
        <span className="font-semibold">Permisos:</span> los administradores gestionan usuarios y
        roles; los agentes ven todos los tickets y pueden asignarlos; los clientes solo acceden a
        sus propios tickets. No puedes cambiar tu propio rol ni desactivar tu cuenta.
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeading
            title="Equipo y clientes"
            description="Cambia roles, activa o desactiva accesos y restablece contraseñas"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <th className="px-5 py-3">Usuario</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3">Tickets</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Alta</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isSelf = user.id === currentUser.id;
                return (
                  <tr key={user.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="md" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                            <span className="truncate">{user.name}</span>
                            {isSelf ? (
                              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600">
                                Tú
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      {isSelf ? (
                        <div className="flex items-center gap-2">
                          <RoleBadge role={user.role} />
                          <span className="text-[10px] text-slate-400">(tu cuenta)</span>
                        </div>
                      ) : (
                        <UserRoleSelect userId={user.id} role={user.role} />
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3 text-xs">
                        <span title="Tickets creados">
                          <span className="font-semibold text-slate-800">
                            {user.ticketsCreated}
                          </span>{" "}
                          <span className="text-[10px] text-slate-400">creados</span>
                        </span>
                        <span title="Tickets activos asignados">
                          <span className="font-semibold text-slate-800">
                            {user.ticketsAssigned}
                          </span>{" "}
                          <span className="text-[10px] text-slate-400">activos</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <UserActiveToggle userId={user.id} active={user.active} isSelf={isSelf} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <ResetPasswordDialog userId={user.id} userName={user.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
