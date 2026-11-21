"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  isStaff,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";
import {
  addComment,
  createTicket,
  getTicketById,
  updateTicket,
} from "@/lib/tickets";
import { findUserById, listAssignableUsers } from "@/lib/users";

const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "El asunto debe tener al menos 5 caracteres.")
    .max(160, "El asunto no puede superar los 160 caracteres."),
  description: z
    .string()
    .trim()
    .min(10, "Describe el problema con al menos 10 caracteres.")
    .max(8000, "La descripción es demasiado larga."),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  requesterId: z.string().optional(),
  assigneeId: z.string().optional(),
});

function refreshTicketViews(ticketId?: number): void {
  revalidatePath("/");
  revalidatePath("/tickets");
  if (ticketId) revalidatePath(`/tickets/${ticketId}`);
}

export async function createTicketAction(
  _previousState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createTicketSchema.safeParse({
    subject: formData.get("subject"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    requesterId: formData.get("requesterId") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  let requesterId = user.id;
  if (isStaff(user.role) && parsed.data.requesterId) {
    const requester = findUserById(Number(parsed.data.requesterId));
    if (!requester || !requester.active) {
      return { error: "El solicitante seleccionado no es válido." };
    }
    requesterId = requester.id;
  }

  let assigneeId: number | null = null;
  if (isStaff(user.role) && parsed.data.assigneeId) {
    const candidate = listAssignableUsers().find(
      (item) => item.id === Number(parsed.data.assigneeId),
    );
    if (!candidate) return { error: "El agente seleccionado no es válido." };
    assigneeId = candidate.id;
  }

  let ticketId: number;
  try {
    ticketId = createTicket({
      subject: parsed.data.subject,
      description: parsed.data.description,
      category: parsed.data.category as TicketCategory,
      priority: parsed.data.priority as TicketPriority,
      requesterId,
      assigneeId,
    });
  } catch {
    return { error: "No se pudo crear el ticket. Inténtalo de nuevo." };
  }

  refreshTicketViews(ticketId);
  redirect(`/tickets/${ticketId}`);
}

const updateSchema = z.object({
  ticketId: z.number().int().positive(),
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]),
  priority: z.enum(TICKET_PRIORITIES),
  category: z.enum(TICKET_CATEGORIES),
  assigneeId: z.number().int().positive().nullable(),
});

export async function updateTicketAction(input: {
  ticketId: number;
  status: string;
  priority: string;
  category: string;
  assigneeId: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tu sesión ha caducado." };
  if (!isStaff(user.role)) return { ok: false, error: "No tienes permisos." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };

  const ticket = getTicketById(parsed.data.ticketId, user);
  if (!ticket) return { ok: false, error: "El ticket no existe." };

  if (parsed.data.assigneeId !== null) {
    const candidate = listAssignableUsers().find((item) => item.id === parsed.data.assigneeId);
    if (!candidate) return { ok: false, error: "El agente seleccionado no es válido." };
  }

  try {
    updateTicket(ticket.id, user, {
      status: parsed.data.status as TicketStatus,
      priority: parsed.data.priority as TicketPriority,
      category: parsed.data.category as TicketCategory,
      assigneeId: parsed.data.assigneeId,
    });
  } catch {
    return { ok: false, error: "No se pudieron guardar los cambios." };
  }

  refreshTicketViews(ticket.id);
  return { ok: true };
}

export async function addCommentAction(input: {
  ticketId: number;
  body: string;
  internal: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tu sesión ha caducado." };

  const ticket = getTicketById(input.ticketId, user);
  if (!ticket) return { ok: false, error: "El ticket no existe." };

  const body = input.body.trim();
  if (body.length < 2) return { ok: false, error: "Escribe un mensaje antes de enviar." };
  if (body.length > 5000) return { ok: false, error: "El mensaje es demasiado largo." };
  if (input.internal && !isStaff(user.role)) {
    return { ok: false, error: "No tienes permisos para crear notas internas." };
  }

  try {
    addComment(ticket.id, user, body, input.internal);
  } catch {
    return { ok: false, error: "No se pudo publicar el mensaje." };
  }

  refreshTicketViews(ticket.id);
  return { ok: true };
}

export async function quickActionAction(input: {
  ticketId: number;
  action: "assign_me" | "resolve" | "close" | "reopen" | "unassign";
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tu sesión ha caducado." };
  if (!isStaff(user.role)) return { ok: false, error: "No tienes permisos." };

  const ticket = getTicketById(input.ticketId, user);
  if (!ticket) return { ok: false, error: "El ticket no existe." };

  try {
    switch (input.action) {
      case "assign_me":
        updateTicket(ticket.id, user, {
          assigneeId: user.id,
          status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
        });
        break;
      case "resolve":
        updateTicket(ticket.id, user, { status: "RESOLVED" });
        break;
      case "close":
        updateTicket(ticket.id, user, { status: "CLOSED" });
        break;
      case "reopen":
        updateTicket(ticket.id, user, { status: "OPEN" });
        break;
      case "unassign":
        updateTicket(ticket.id, user, { assigneeId: null });
        break;
      default:
        return { ok: false, error: "Acción no válida." };
    }
  } catch {
    return { ok: false, error: "No se pudo completar la acción." };
  }

  refreshTicketViews(ticket.id);
  return { ok: true };
}
