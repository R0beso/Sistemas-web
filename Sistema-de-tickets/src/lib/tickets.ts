import {
  ACTIVE_STATUSES,
  CATEGORY_META,
  PAGE_SIZE,
  PRIORITY_META,
  STATUS_META,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  isStaff,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type UserRole,
} from "./constants";
import { getDb, nowIso } from "./db";
import type {
  Activity,
  Comment,
  DashboardStats,
  DayCount,
  StatusCount,
  TicketWithPeople,
  User,
} from "./types";

function mapTicket(row: Record<string, unknown>): TicketWithPeople {
  return {
    id: Number(row.id),
    subject: String(row.subject),
    description: String(row.description),
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    category: row.category as TicketCategory,
    requesterId: Number(row.requester_id),
    assigneeId: row.assignee_id === null ? null : Number(row.assignee_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    closedAt: row.closed_at ? String(row.closed_at) : null,
    requesterName: String(row.requester_name),
    requesterEmail: String(row.requester_email),
    assigneeName: row.assignee_name ? String(row.assignee_name) : null,
    assigneeEmail: row.assignee_email ? String(row.assignee_email) : null,
    commentCount: Number(row.comment_count ?? 0),
  };
}

const TICKET_SELECT = `
  SELECT t.*,
    r.name AS requester_name,
    r.email AS requester_email,
    a.name AS assignee_name,
    a.email AS assignee_email,
    (SELECT COUNT(*) FROM comments c WHERE c.ticket_id = t.id AND (? OR c.internal = 0)) AS comment_count
  FROM tickets t
  JOIN users r ON r.id = t.requester_id
  LEFT JOIN users a ON a.id = t.assignee_id
`;

export interface TicketFilters {
  q?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  category?: string;
  page?: number;
}

export interface TicketListResult {
  tickets: TicketWithPeople[];
  total: number;
  page: number;
  pageCount: number;
}

function buildFilters(
  viewer: User,
  filters: TicketFilters,
): { where: string; params: Array<string | number> } {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (viewer.role === "CLIENT") {
    clauses.push("t.requester_id = ?");
    params.push(viewer.id);
  }

  const status = filters.status;
  if (status && (TICKET_STATUSES as readonly string[]).includes(status)) {
    clauses.push("t.status = ?");
    params.push(status);
  }

  const priority = filters.priority;
  if (priority && (TICKET_PRIORITIES as readonly string[]).includes(priority)) {
    clauses.push("t.priority = ?");
    params.push(priority);
  }

  const category = filters.category;
  if (category && (TICKET_CATEGORIES as readonly string[]).includes(category)) {
    clauses.push("t.category = ?");
    params.push(category);
  }

  const assignee = filters.assignee;
  if (assignee === "me") {
    clauses.push("t.assignee_id = ?");
    params.push(viewer.id);
  } else if (assignee === "unassigned") {
    clauses.push("t.assignee_id IS NULL");
  } else if (assignee && /^\d+$/.test(assignee)) {
    clauses.push("t.assignee_id = ?");
    params.push(Number(assignee));
  }

  const q = filters.q?.trim();
  if (q) {
    const like = `%${q}%`;
    clauses.push("(t.subject LIKE ? OR t.description LIKE ? OR CAST(t.id AS TEXT) LIKE ?)");
    params.push(like, like, like);
  }

  return {
    where: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export function listTickets(viewer: User, filters: TicketFilters): TicketListResult {
  const db = getDb();
  const { where, params } = buildFilters(viewer, filters);
  const includeInternal = isStaff(viewer.role) ? 1 : 0;

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS count FROM tickets t ${where}`)
    .get(...params) as { count: number } | undefined;
  const total = Number(totalRow?.count ?? 0);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Math.max(1, Math.floor(filters.page ?? 1));
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = db
    .prepare(`${TICKET_SELECT} ${where} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`)
    .all(includeInternal, ...params, PAGE_SIZE, offset) as Array<Record<string, unknown>>;

  return { tickets: rows.map(mapTicket), total, page, pageCount };
}

export function getStatusCounts(viewer: User): Record<TicketStatus, number> {
  const rows = getDb()
    .prepare(
      `SELECT status, COUNT(*) AS count FROM tickets t
       ${viewer.role === "CLIENT" ? "WHERE t.requester_id = ?" : ""}
       GROUP BY status`,
    )
    .all(...(viewer.role === "CLIENT" ? [viewer.id] : [])) as Array<{
    status: TicketStatus;
    count: number;
  }>;

  const counts = {} as Record<TicketStatus, number>;
  for (const status of TICKET_STATUSES) {
    counts[status] = Number(rows.find((row) => row.status === status)?.count ?? 0);
  }
  return counts;
}

export function getTicketById(id: number, viewer: User): TicketWithPeople | null {
  const includeInternal = isStaff(viewer.role) ? 1 : 0;
  const row = getDb()
    .prepare(`${TICKET_SELECT} WHERE t.id = ?`)
    .get(includeInternal, id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const ticket = mapTicket(row);
  if (viewer.role === "CLIENT" && ticket.requesterId !== viewer.id) return null;
  return ticket;
}

export function getComments(ticketId: number, includeInternal: boolean): Comment[] {
  const rows = getDb()
    .prepare(
      `SELECT c.*, u.name AS author_name, u.role AS author_role
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.ticket_id = ? ${includeInternal ? "" : "AND c.internal = 0"}
       ORDER BY c.created_at ASC`,
    )
    .all(ticketId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: Number(row.id),
    ticketId: Number(row.ticket_id),
    authorId: Number(row.author_id),
    authorName: String(row.author_name),
    authorRole: row.author_role as UserRole,
    body: String(row.body),
    internal: Number(row.internal) === 1,
    createdAt: String(row.created_at),
  }));
}

export function getActivities(ticketId: number): Activity[] {
  const rows = getDb()
    .prepare(
      `SELECT a.*, u.name AS actor_name
       FROM activities a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.ticket_id = ?
       ORDER BY a.created_at ASC`,
    )
    .all(ticketId) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: Number(row.id),
    ticketId: Number(row.ticket_id),
    actorId: row.actor_id === null ? null : Number(row.actor_id),
    actorName: row.actor_name ? String(row.actor_name) : null,
    type: String(row.type),
    detail: row.detail ? String(row.detail) : null,
    createdAt: String(row.created_at),
  }));
}

export interface NewTicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  requesterId: number;
  assigneeId: number | null;
}

export function createTicket(input: NewTicketInput): number {
  const db = getDb();
  const now = nowIso();
  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        `INSERT INTO tickets
          (subject, description, status, priority, category, requester_id, assignee_id,
           created_at, updated_at, resolved_at, closed_at)
         VALUES (?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      )
      .run(
        input.subject,
        input.description,
        input.priority,
        input.category,
        input.requesterId,
        input.assigneeId,
        now,
        now,
      );

    const ticketId = Number(result.lastInsertRowid);
    db.prepare(
      "INSERT INTO activities (ticket_id, actor_id, type, detail, created_at) VALUES (?, ?, 'CREATED', ?, ?)",
    ).run(ticketId, input.requesterId, "Ticket creado", now);

    if (input.assigneeId) {
      const assignee = db
        .prepare("SELECT name FROM users WHERE id = ?")
        .get(input.assigneeId) as { name: string } | undefined;
      db.prepare(
        "INSERT INTO activities (ticket_id, actor_id, type, detail, created_at) VALUES (?, ?, 'ASSIGNED', ?, ?)",
      ).run(ticketId, input.requesterId, `Asignado a ${assignee?.name ?? "un agente"}`, now);
    }

    db.exec("COMMIT");
    return ticketId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export interface TicketUpdate {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigneeId?: number | null;
}

export function updateTicket(ticketId: number, actor: User, changes: TicketUpdate): void {
  const db = getDb();
  const current = db
    .prepare("SELECT * FROM tickets WHERE id = ?")
    .get(ticketId) as Record<string, unknown> | undefined;
  if (!current) throw new Error("El ticket no existe.");

  const now = nowIso();
  const set: string[] = [];
  const params: Array<string | number | null> = [];
  const activities: Array<{ type: string; detail: string }> = [];

  const currentStatus = current.status as TicketStatus;
  if (changes.status && changes.status !== currentStatus) {
    set.push("status = ?");
    params.push(changes.status);
    activities.push({
      type: "STATUS",
      detail: `Estado cambiado de ${STATUS_META[currentStatus].label} a ${STATUS_META[changes.status].label}`,
    });

    if (changes.status === "RESOLVED" && !current.resolved_at) {
      set.push("resolved_at = ?");
      params.push(now);
    }
    if (changes.status === "CLOSED") {
      set.push("closed_at = ?");
      params.push(now);
      if (!current.resolved_at) {
        set.push("resolved_at = ?");
        params.push(now);
      }
    }
    if (ACTIVE_STATUSES.includes(changes.status)) {
      set.push("resolved_at = NULL", "closed_at = NULL");
    }
  }

  if (changes.priority && changes.priority !== current.priority) {
    set.push("priority = ?");
    params.push(changes.priority);
    activities.push({
      type: "PRIORITY",
      detail: `Prioridad cambiada de ${PRIORITY_META[current.priority as TicketPriority].label} a ${PRIORITY_META[changes.priority].label}`,
    });
  }

  if (changes.category && changes.category !== current.category) {
    set.push("category = ?");
    params.push(changes.category);
    activities.push({
      type: "CATEGORY",
      detail: `Categoría cambiada de ${CATEGORY_META[current.category as TicketCategory].label} a ${CATEGORY_META[changes.category].label}`,
    });
  }

  if (changes.assigneeId !== undefined && changes.assigneeId !== current.assignee_id) {
    set.push("assignee_id = ?");
    params.push(changes.assigneeId);
    if (changes.assigneeId === null) {
      activities.push({ type: "ASSIGNED", detail: "Ticket sin asignar" });
    } else {
      const assignee = db
        .prepare("SELECT name FROM users WHERE id = ?")
        .get(changes.assigneeId) as { name: string } | undefined;
      activities.push({
        type: "ASSIGNED",
        detail: `Asignado a ${assignee?.name ?? "un agente"}`,
      });
    }
  }

  if (set.length === 0) return;

  set.push("updated_at = ?");
  params.push(now);
  params.push(ticketId);

  db.exec("BEGIN");
  try {
    db.prepare(`UPDATE tickets SET ${set.join(", ")} WHERE id = ?`).run(...params);
    for (const activity of activities) {
      db.prepare(
        "INSERT INTO activities (ticket_id, actor_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(ticketId, actor.id, activity.type, activity.detail, now);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function addComment(
  ticketId: number,
  actor: User,
  body: string,
  internal: boolean,
): void {
  if (internal && !isStaff(actor.role)) {
    throw new Error("No puedes crear notas internas.");
  }
  const db = getDb();
  const now = nowIso();
  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO comments (ticket_id, author_id, body, internal, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(ticketId, actor.id, body, internal ? 1 : 0, now);
    db.prepare(
      "INSERT INTO activities (ticket_id, actor_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      ticketId,
      actor.id,
      internal ? "NOTE" : "COMMENT",
      internal ? "Añadió una nota interna" : "Respondió al ticket",
      now,
    );
    db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(now, ticketId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export interface RecentActivity {
  id: number;
  ticketId: number;
  ticketSubject: string;
  actorName: string | null;
  type: string;
  detail: string | null;
  createdAt: string;
}

export interface AgentWorkload {
  id: number;
  name: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  statusCounts: StatusCount[];
  last7Days: DayCount[];
  recentTickets: TicketWithPeople[];
  myTickets: TicketWithPeople[];
  workload: AgentWorkload[];
  recentActivity: RecentActivity[];
}

export function getDashboardData(viewer: User): DashboardData {
  const db = getDb();
  const staff = isStaff(viewer.role);
  const scope = staff ? "" : " AND t.requester_id = ?";
  const scopeParams: Array<string | number> = staff ? [] : [viewer.id];
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const includeInternal = staff ? 1 : 0;

  const statsRow = db
    .prepare(
      `SELECT
        SUM(CASE WHEN t.status = 'OPEN' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN t.assignee_id IS NULL AND t.status IN ('OPEN', 'IN_PROGRESS', 'PENDING') THEN 1 ELSE 0 END) AS unassigned,
        SUM(CASE WHEN t.priority = 'URGENT' AND t.status IN ('OPEN', 'IN_PROGRESS', 'PENDING') THEN 1 ELSE 0 END) AS urgent,
        SUM(CASE WHEN t.resolved_at IS NOT NULL AND t.resolved_at >= ? THEN 1 ELSE 0 END) AS resolved_week,
        COUNT(*) AS total,
        AVG(CASE WHEN t.resolved_at IS NOT NULL
          THEN (julianday(t.resolved_at) - julianday(t.created_at)) * 86400000 END) AS avg_ms
      FROM tickets t
      WHERE 1 = 1 ${scope}`,
    )
    .get(weekAgo, ...scopeParams) as Record<string, unknown> | undefined;

  const stats: DashboardStats = {
    open: Number(statsRow?.open ?? 0),
    inProgress: Number(statsRow?.in_progress ?? 0),
    pending: Number(statsRow?.pending ?? 0),
    unassigned: Number(statsRow?.unassigned ?? 0),
    urgent: Number(statsRow?.urgent ?? 0),
    resolvedThisWeek: Number(statsRow?.resolved_week ?? 0),
    total: Number(statsRow?.total ?? 0),
    avgResolutionMs:
      statsRow?.avg_ms === null || statsRow?.avg_ms === undefined
        ? null
        : Number(statsRow.avg_ms),
  };

  const statusRows = db
    .prepare(
      `SELECT t.status, COUNT(*) AS count FROM tickets t
       WHERE 1 = 1 ${scope} GROUP BY t.status`,
    )
    .all(...scopeParams) as Array<{ status: TicketStatus; count: number }>;

  const statusCounts = TICKET_STATUSES.map((status) => ({
    status,
    count: Number(statusRows.find((row) => row.status === status)?.count ?? 0),
  }));

  const startDay = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const dayRows = db
    .prepare(
      `SELECT substr(t.created_at, 1, 10) AS day, COUNT(*) AS count
       FROM tickets t
       WHERE substr(t.created_at, 1, 10) >= ? ${scope}
       GROUP BY day`,
    )
    .all(startDay, ...scopeParams) as Array<{ day: string; count: number }>;

  const last7Days: DayCount[] = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.now() - (6 - index) * 86_400_000).toISOString().slice(0, 10);
    return { day, count: Number(dayRows.find((row) => row.day === day)?.count ?? 0) };
  });

  const recentTickets = db
    .prepare(`${TICKET_SELECT} WHERE 1 = 1 ${scope} ORDER BY t.updated_at DESC LIMIT 6`)
    .all(includeInternal, ...scopeParams) as Array<Record<string, unknown>>;

  const myScope = staff
    ? "WHERE t.assignee_id = ? AND t.status IN ('OPEN', 'IN_PROGRESS', 'PENDING')"
    : "WHERE t.requester_id = ?";
  const myTickets = db
    .prepare(`${TICKET_SELECT} ${myScope} ORDER BY t.updated_at DESC LIMIT 5`)
    .all(includeInternal, viewer.id) as Array<Record<string, unknown>>;

  let workload: AgentWorkload[] = [];
  if (staff) {
    const workloadRows = db
      .prepare(
        `SELECT u.id, u.name, COUNT(t.id) AS count
         FROM tickets t
         JOIN users u ON u.id = t.assignee_id
         WHERE t.status IN ('OPEN', 'IN_PROGRESS', 'PENDING')
         GROUP BY u.id, u.name
         ORDER BY count DESC, u.name COLLATE NOCASE
         LIMIT 6`,
      )
      .all() as Array<{ id: number; name: string; count: number }>;
    workload = workloadRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      count: Number(row.count),
    }));
  }

  const activityRows = db
    .prepare(
      `SELECT a.id, a.ticket_id, a.type, a.detail, a.created_at,
        u.name AS actor_name, t.subject AS ticket_subject
       FROM activities a
       JOIN tickets t ON t.id = a.ticket_id
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE 1 = 1 ${scope}
       ORDER BY a.created_at DESC
       LIMIT 7`,
    )
    .all(...scopeParams) as Array<Record<string, unknown>>;

  const recentActivity: RecentActivity[] = activityRows.map((row) => ({
    id: Number(row.id),
    ticketId: Number(row.ticket_id),
    ticketSubject: String(row.ticket_subject),
    actorName: row.actor_name ? String(row.actor_name) : null,
    type: String(row.type),
    detail: row.detail ? String(row.detail) : null,
    createdAt: String(row.created_at),
  }));

  return {
    stats,
    statusCounts,
    last7Days,
    recentTickets: recentTickets.map(mapTicket),
    myTickets: myTickets.map(mapTicket),
    workload,
    recentActivity,
  };
}
