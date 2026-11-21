import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  Tag,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, PriorityBadge, RoleBadge, StatusBadge } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { CATEGORY_META, isStaff } from "@/lib/constants";
import { formatDateTime, formatDuration, relativeTime, ticketCode } from "@/lib/format";
import { getActivities, getComments, getTicketById } from "@/lib/tickets";
import { listAssignableUsers } from "@/lib/users";
import { CommentForm } from "./comment-form";
import { QuickActions } from "./quick-actions";
import { TicketProperties } from "./ticket-properties";
import { Timeline } from "./timeline";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Ticket" };
  const ticket = getTicketById(Number(id), user);
  if (!ticket) return { title: "Ticket no encontrado" };
  return { title: `${ticketCode(ticket.id)} · ${ticket.subject}` };
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{children}</dd>
    </div>
  );
}

export default async function TicketDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) notFound();

  const user = await requireUser();
  const ticket = getTicketById(ticketId, user);
  if (!ticket) notFound();

  const staff = isStaff(user.role);
  const comments = getComments(ticket.id, staff);
  const activities = getActivities(ticket.id);
  const agents = staff ? listAssignableUsers().map(({ id: agentId, name }) => ({ id: agentId, name })) : [];

  const now = Date.now();
  const ageMs = now - new Date(ticket.createdAt).getTime();
  const resolutionMs = ticket.resolvedAt
    ? new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()
    : null;
  const category = CATEGORY_META[ticket.category];

  return (
    <div className="space-y-6 animate-in">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a tickets
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-white">
              {ticketCode(ticket.id)}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
            </Badge>
          </div>
          <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
            {ticket.subject}
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Creado por{" "}
            <span className="font-semibold text-slate-700">{ticket.requesterName}</span> ·{" "}
            {formatDateTime(ticket.createdAt)} · {ticket.commentCount}{" "}
            {ticket.commentCount === 1 ? "mensaje" : "mensajes"}
          </p>
        </div>

        {staff ? (
          <QuickActions
            ticketId={ticket.id}
            status={ticket.status}
            assigneeId={ticket.assigneeId}
            currentUserId={user.id}
          />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Descripción</h2>
              <span className="text-[11px] text-slate-400">
                Actualizado {relativeTime(ticket.updatedAt)}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {ticket.description}
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Conversación</h2>
              <span className="text-[11px] text-slate-400">
                {comments.length} {comments.length === 1 ? "mensaje" : "mensajes"}
              </span>
            </div>
            <Timeline comments={comments} activities={activities} />
          </section>

          <CommentForm
            ticketId={ticket.id}
            isStaff={staff}
            authorName={user.name}
          />
        </div>

        <aside className="space-y-4">
          {staff ? (
            <TicketProperties
              ticket={{
                id: ticket.id,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                assigneeId: ticket.assigneeId,
              }}
              agents={agents}
            />
          ) : (
            <section className="card p-5">
              <h2 className="text-sm font-bold text-slate-900">Detalles</h2>
              <dl className="mt-4 space-y-3 text-xs">
                <InfoRow label="Estado">
                  <StatusBadge status={ticket.status} />
                </InfoRow>
                <InfoRow label="Prioridad">
                  <PriorityBadge priority={ticket.priority} />
                </InfoRow>
                <InfoRow label="Categoría">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3 text-slate-400" />
                    {category.label}
                  </span>
                </InfoRow>
                <InfoRow label="Asignado">
                  {ticket.assigneeName ?? <span className="text-slate-400">Sin asignar</span>}
                </InfoRow>
              </dl>
            </section>
          )}

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserRound className="h-4 w-4 text-slate-400" />
              Solicitante
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={ticket.requesterName} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {ticket.requesterName}
                </p>
                <a
                  href={`mailto:${ticket.requesterEmail}`}
                  className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500 transition hover:text-indigo-600"
                >
                  <Mail className="h-3 w-3 shrink-0" />
                  {ticket.requesterEmail}
                </a>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="label">Asignado a</p>
              {ticket.assigneeName ? (
                <div className="flex items-center gap-2.5">
                  <Avatar name={ticket.assigneeName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {ticket.assigneeName}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {ticket.assigneeEmail}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sin asignar todavía</p>
              )}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock3 className="h-4 w-4 text-slate-400" />
              Fechas
            </h2>
            <dl className="mt-4 space-y-2.5 text-xs">
              <InfoRow label="Creado">{formatDateTime(ticket.createdAt)}</InfoRow>
              <InfoRow label="Actualizado">{formatDateTime(ticket.updatedAt)}</InfoRow>
              {ticket.resolvedAt ? (
                <InfoRow label="Resuelto">{formatDateTime(ticket.resolvedAt)}</InfoRow>
              ) : null}
              {ticket.closedAt ? (
                <InfoRow label="Cerrado">{formatDateTime(ticket.closedAt)}</InfoRow>
              ) : null}
              <div className="border-t border-slate-100 pt-2.5">
                <InfoRow label={resolutionMs ? "Resolución" : "Tiempo abierto"}>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-slate-400" />
                    {formatDuration(resolutionMs ?? ageMs)}
                  </span>
                </InfoRow>
              </div>
            </dl>
          </section>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <Archive className="h-3.5 w-3.5 text-slate-400" />
              Historial completo
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Todos los cambios de estado, prioridad y asignación quedan registrados en la
              conversación.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
