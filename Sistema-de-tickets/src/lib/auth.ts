import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isStaff } from "./constants";
import { getDb, nowIso } from "./db";
import { verifyPassword } from "./password";
import type { User } from "./types";
import { mapUser } from "./users";

const SESSION_COOKIE = "helpdesk_session";
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(email.trim()) as Record<string, unknown> | undefined;

  if (!row || !verifyPassword(password, String(row.password_hash))) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  const user = mapUser(row);
  if (!user.active) {
    return { ok: false, error: "Esta cuenta está desactivada. Contacta con un administrador." };
  }

  const token = randomBytes(32).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();

  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, user.id, createdAt, expiresAt);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(createdAt);

  const store = await cookies();
  const requestHeaders = await headers();
  const isHttps =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return { ok: true, user };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.*, s.expires_at AS session_expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as Record<string, unknown> | undefined;

  if (!row) return null;

  if (new Date(String(row.session_expires_at)).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  const user = mapUser(row);
  if (!user.active) return null;
  return user;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireStaff(): Promise<User> {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/tickets");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/tickets");
  return user;
}

export function assertStaff(user: User): void {
  if (!isStaff(user.role)) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }
}
