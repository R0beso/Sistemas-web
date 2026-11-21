import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDatabase } from "./seed";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "helpdesk.db");

const globalForDb = globalThis as unknown as { __helpdeskDb?: DatabaseSync };

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('ADMIN', 'AGENT', 'CLIENT')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED')),
      priority TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      category TEXT NOT NULL DEFAULT 'OTRO'
        CHECK (category IN ('HARDWARE', 'SOFTWARE', 'RED', 'ACCESO', 'FACTURACION', 'OTRO')),
      requester_id INTEGER NOT NULL REFERENCES users(id),
      assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      closed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_updated ON tickets(updated_at);

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activities_ticket ON activities(ticket_id);
  `);
}

/** Conexión única a SQLite, reutilizada durante el ciclo de vida del proceso. */
export function getDb(): DatabaseSync {
  if (globalForDb.__helpdeskDb) return globalForDb.__helpdeskDb;

  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  migrate(db);

  const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as
    | { count: number }
    | undefined;
  if (!row || Number(row.count) === 0) {
    seedDatabase(db);
  }

  globalForDb.__helpdeskDb = db;
  return db;
}

export function nowIso(): string {
  return new Date().toISOString();
}
