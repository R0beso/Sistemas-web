'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { addDays, todayString } = require('./lib/time');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(dataDir, 'reservas.db');

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 5 AND 480),
    price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
    color TEXT NOT NULL DEFAULT '#4f46e5',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#0ea5e9',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_schedules_resource
    ON schedules (resource_id, weekday);

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    service_id INTEGER NOT NULL REFERENCES services(id),
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL DEFAULT '',
    customer_phone TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed'
      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_resource_date
    ON bookings (resource_id, date, status);
  CREATE INDEX IF NOT EXISTS idx_bookings_date
    ON bookings (date, status);
`);

const defaultSettings = {
  business_name: 'ReservaFácil',
  business_tagline: 'Reserva tu próxima cita en segundos, sin llamadas ni esperas.',
  currency_symbol: '$',
  slot_interval: '30',
  max_advance_days: '60',
  lead_time_minutes: '60',
  auto_confirm: '1',
  contact_email: 'hola@reservafacil.com',
  contact_phone: '+1 555 0100',
  address: 'Av. Central 123, Ciudad',
};

const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

function seedDemoData() {
  const alreadySeeded = db
    .prepare("SELECT value FROM settings WHERE key = 'seeded'")
    .get();
  if (alreadySeeded) return;

  const insertService = db.prepare(`
    INSERT INTO services (name, description, duration_min, price, color)
    VALUES (?, ?, ?, ?, ?)
  `);
  const services = [
    [
      'Consulta inicial',
      'Evaluación breve para conocer tus necesidades y armar un plan a medida.',
      30,
      20,
      '#0ea5e9',
    ],
    [
      'Corte y estilo',
      'Servicio completo de corte, lavado y peinado con acabado profesional.',
      45,
      25,
      '#4f46e5',
    ],
    [
      'Sesión completa',
      'Atención integral con seguimiento y recomendaciones personalizadas.',
      60,
      45,
      '#f97316',
    ],
    [
      'Sesión premium',
      'Experiencia extendida con dedicación exclusiva y atención prioritaria.',
      90,
      65,
      '#8b5cf6',
    ],
  ];
  for (const service of services) insertService.run(...service);

  const insertResource = db.prepare(`
    INSERT INTO resources (name, role, email, phone, color)
    VALUES (?, ?, ?, ?, ?)
  `);
  const resources = [
    ['Ana García', 'Especialista principal', 'ana@reservafacil.com', '+1 555 0101', '#4f46e5'],
    ['Luis Ramos', 'Especialista', 'luis@reservafacil.com', '+1 555 0102', '#0ea5e9'],
    ['Sala Principal', 'Espacio de atención', '', '', '#f97316'],
  ];
  for (const resource of resources) insertResource.run(...resource);

  const insertSchedule = db.prepare(`
    INSERT INTO schedules (resource_id, weekday, start_time, end_time)
    VALUES (?, ?, ?, ?)
  `);
  for (let resourceId = 1; resourceId <= resources.length; resourceId += 1) {
    for (let weekday = 1; weekday <= 5; weekday += 1) {
      insertSchedule.run(resourceId, weekday, '09:00', '13:00');
      insertSchedule.run(resourceId, weekday, '14:00', '18:00');
    }
    insertSchedule.run(resourceId, 6, '09:00', '13:00');
  }

  const today = todayString();
  const tomorrow = addDays(today, 1);
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      code, service_id, resource_id, customer_name, customer_email,
      customer_phone, date, start_time, end_time, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const demoBookings = [
    ['DEMO1001', 2, 1, 'María López', 'maria@example.com', '+1 555 2001', today, '10:00', '10:45', 'confirmed', 'Primera visita.'],
    ['DEMO1002', 1, 2, 'Jorge Martín', 'jorge@example.com', '+1 555 2002', today, '11:30', '12:00', 'pending', ''],
    ['DEMO1003', 3, 3, 'Carla Ruiz', 'carla@example.com', '+1 555 2003', today, '15:00', '16:00', 'confirmed', ''],
    ['DEMO1004', 2, 2, 'Diego Sánchez', 'diego@example.com', '+1 555 2004', tomorrow, '09:30', '10:15', 'confirmed', ''],
    ['DEMO1005', 4, 1, 'Lucía Torres', 'lucia@example.com', '+1 555 2005', tomorrow, '16:00', '17:30', 'pending', ''],
  ];
  for (const booking of demoBookings) insertBooking.run(...booking);

  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('seeded', '1')"
  ).run();
}

seedDemoData();

function getSettingsMap() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { db, dbPath, getSettingsMap, transaction };
