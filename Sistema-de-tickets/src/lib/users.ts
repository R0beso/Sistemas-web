import type { UserRole } from "./constants";
import { getDb, nowIso } from "./db";
import { hashPassword } from "./password";
import type { User, UserWithPassword, UserWithStats } from "./types";

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as UserRole,
    active: Number(row.active) === 1,
    createdAt: String(row.created_at),
  };
}

export function findUserByEmail(email: string): UserWithPassword | null {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(email.trim()) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...mapUser(row), passwordHash: String(row.password_hash) };
}

export function findUserById(id: number): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapUser(row) : null;
}

export function listUsers(): UserWithStats[] {
  const rows = getDb()
    .prepare(
      `SELECT u.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.requester_id = u.id) AS tickets_created,
        (SELECT COUNT(*) FROM tickets t WHERE t.assignee_id = u.id
          AND t.status IN ('OPEN', 'IN_PROGRESS', 'PENDING')) AS tickets_assigned
       FROM users u
       ORDER BY CASE u.role WHEN 'ADMIN' THEN 0 WHEN 'AGENT' THEN 1 ELSE 2 END, u.name COLLATE NOCASE`,
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    ...mapUser(row),
    ticketsCreated: Number(row.tickets_created),
    ticketsAssigned: Number(row.tickets_assigned),
  }));
}

export function listAssignableUsers(): User[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM users
       WHERE active = 1 AND role IN ('ADMIN', 'AGENT')
       ORDER BY name COLLATE NOCASE`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapUser);
}

export function listActiveUsers(): User[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM users
       WHERE active = 1
       ORDER BY CASE role WHEN 'CLIENT' THEN 1 ELSE 0 END, name COLLATE NOCASE`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapUser);
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export function createUser(input: CreateUserInput): { ok: true; user: User } | { ok: false; error: string } {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
    .get(email);
  if (existing) {
    return { ok: false, error: "Ya existe un usuario con ese correo electrónico." };
  }

  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
    )
    .run(input.name.trim(), email, hashPassword(input.password), input.role, nowIso());

  const user = findUserById(Number(result.lastInsertRowid));
  if (!user) return { ok: false, error: "No se pudo crear el usuario." };
  return { ok: true, user };
}

export function updateUserRole(userId: number, role: UserRole): void {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}

export function setUserActive(userId: number, active: boolean): void {
  getDb().prepare("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, userId);
  if (!active) {
    getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }
}

export function resetUserPassword(userId: number, password: string): void {
  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(password), userId);
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

export function countActiveAdmins(excludeUserId?: number): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND active = 1 AND id != ?",
    )
    .get(excludeUserId ?? -1) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}
