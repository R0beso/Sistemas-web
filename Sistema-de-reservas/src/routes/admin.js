'use strict';

const express = require('express');
const { db, getSettingsMap, transaction } = require('../db');
const {
  adminBooking,
  getStats,
  listBookings,
  updateBookingStatus,
} = require('../lib/bookings');
const { badRequest, notFound } = require('../lib/errors');
const { timeToMinutes } = require('../lib/time');

const router = express.Router();

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

function cleanText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function parseColor(value, fallback) {
  const color = cleanText(value, 7);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function parseActive(value, fallback = 1) {
  if (value === undefined || value === null) return fallback;
  if (value === true || value === 1 || value === '1') return 1;
  return 0;
}

function parseServicePayload(body, existing = null) {
  const name = cleanText(body.name ?? existing?.name, 80);
  if (name.length < 2) throw badRequest('El nombre del servicio es obligatorio');

  const duration = Number.parseInt(body.duration_min ?? existing?.duration_min, 10);
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    throw badRequest('La duración debe estar entre 5 y 480 minutos');
  }

  const price = Number.parseFloat(body.price ?? existing?.price ?? 0);
  if (!Number.isFinite(price) || price < 0 || price > 1000000) {
    throw badRequest('El precio no es válido');
  }

  return {
    name,
    description: cleanText(body.description ?? existing?.description, 300),
    duration_min: duration,
    price: Math.round(price * 100) / 100,
    color: parseColor(body.color ?? existing?.color, '#4f46e5'),
    active: parseActive(body.active, existing ? existing.active : 1),
  };
}

function parseSchedules(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw badRequest('El horario no es válido');
  if (value.length > 28) throw badRequest('Hay demasiados tramos de horario');

  const schedules = value.map((item) => {
    const weekday = Number.parseInt(item.weekday, 10);
    const start = cleanText(item.start_time, 5);
    const end = cleanText(item.end_time, 5);
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw badRequest('Día de la semana inválido');
    }
    if (!Number.isInteger(startMin) || !Number.isInteger(endMin) || startMin >= endMin) {
      throw badRequest('Los tramos de horario no son válidos');
    }
    return { weekday, start_time: start, end_time: end };
  });

  schedules.sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
  for (let i = 1; i < schedules.length; i += 1) {
    const previous = schedules[i - 1];
    const current = schedules[i];
    if (
      previous.weekday === current.weekday &&
      timeToMinutes(current.start_time) < timeToMinutes(previous.end_time)
    ) {
      throw badRequest('Los tramos de horario se solapan');
    }
  }
  return schedules;
}

function parseResourcePayload(body, existing = null) {
  const name = cleanText(body.name ?? existing?.name, 80);
  if (name.length < 2) throw badRequest('El nombre es obligatorio');
  const schedules = parseSchedules(body.schedules !== undefined ? body.schedules : undefined);
  return {
    name,
    role: cleanText(body.role ?? existing?.role, 80),
    email: cleanText(body.email ?? existing?.email, 160).toLowerCase(),
    phone: cleanText(body.phone ?? existing?.phone, 40),
    color: parseColor(body.color ?? existing?.color, '#0ea5e9'),
    active: parseActive(body.active, existing ? existing.active : 1),
    schedules,
  };
}

function replaceSchedules(resourceId, schedules) {
  if (schedules === undefined) return;
  db.prepare('DELETE FROM schedules WHERE resource_id = ?').run(resourceId);
  const insert = db.prepare(
    'INSERT INTO schedules (resource_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?)'
  );
  for (const schedule of schedules) {
    insert.run(resourceId, schedule.weekday, schedule.start_time, schedule.end_time);
  }
}

/* ------------------------------- Servicios ------------------------------- */

router.get('/services', (req, res) => {
  const services = db
    .prepare('SELECT * FROM services ORDER BY active DESC, id')
    .all();
  res.json(services);
});

router.post('/services', (req, res) => {
  const payload = parseServicePayload(req.body || {});
  const result = db
    .prepare(
      `INSERT INTO services (name, description, duration_min, price, color, active)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      payload.name,
      payload.description,
      payload.duration_min,
      payload.price,
      payload.color,
      payload.active
    );
  res.status(201).json(
    db.prepare('SELECT * FROM services WHERE id = ?').get(Number(result.lastInsertRowid))
  );
});

router.put('/services/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(req.params.id));
  if (!existing) throw notFound('Servicio no encontrado');
  const payload = parseServicePayload(req.body || {}, existing);
  db.prepare(
    `UPDATE services SET name = ?, description = ?, duration_min = ?, price = ?, color = ?, active = ?
     WHERE id = ?`
  ).run(
    payload.name,
    payload.description,
    payload.duration_min,
    payload.price,
    payload.color,
    payload.active,
    existing.id
  );
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(existing.id));
});

router.delete('/services/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(req.params.id));
  if (!existing) throw notFound('Servicio no encontrado');
  if (existing.active) {
    const activeCount = db.prepare('SELECT COUNT(*) AS total FROM services WHERE active = 1').get();
    if (activeCount.total <= 1) {
      throw badRequest('Debe quedar al menos un servicio activo');
    }
  }
  db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

/* ------------------------------- Recursos -------------------------------- */

router.get('/resources', (req, res) => {
  const resources = db.prepare('SELECT * FROM resources ORDER BY active DESC, name').all();
  const schedules = db
    .prepare('SELECT * FROM schedules ORDER BY weekday, start_time')
    .all();
  const byResource = new Map();
  for (const schedule of schedules) {
    if (!byResource.has(schedule.resource_id)) byResource.set(schedule.resource_id, []);
    byResource.get(schedule.resource_id).push({
      weekday: schedule.weekday,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
    });
  }
  res.json(
    resources.map((resource) => ({
      ...resource,
      schedules: byResource.get(resource.id) || [],
    }))
  );
});

router.post('/resources', (req, res) => {
  const payload = parseResourcePayload(req.body || {});
  const resource = transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO resources (name, role, email, phone, color, active)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(payload.name, payload.role, payload.email, payload.phone, payload.color, payload.active);
    const id = Number(result.lastInsertRowid);
    replaceSchedules(id, payload.schedules || []);
    return db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  });
  res.status(201).json(resource);
});

router.put('/resources/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(Number(req.params.id));
  if (!existing) throw notFound('Profesional o recurso no encontrado');
  const payload = parseResourcePayload(req.body || {}, existing);

  const resource = transaction(() => {
    db.prepare(
      `UPDATE resources SET name = ?, role = ?, email = ?, phone = ?, color = ?, active = ?
       WHERE id = ?`
    ).run(payload.name, payload.role, payload.email, payload.phone, payload.color, payload.active, existing.id);
    replaceSchedules(existing.id, payload.schedules);
    return db.prepare('SELECT * FROM resources WHERE id = ?').get(existing.id);
  });

  res.json(resource);
});

router.delete('/resources/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(Number(req.params.id));
  if (!existing) throw notFound('Profesional o recurso no encontrado');
  if (existing.active) {
    const activeCount = db.prepare('SELECT COUNT(*) AS total FROM resources WHERE active = 1').get();
    if (activeCount.total <= 1) {
      throw badRequest('Debe quedar al menos un profesional o recurso activo');
    }
  }
  db.prepare('UPDATE resources SET active = 0 WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

/* ------------------------------- Reservas -------------------------------- */

router.get('/stats', (req, res) => {
  res.json(getStats());
});

router.get('/bookings/export', (req, res) => {
  const bookings = listBookings({ ...req.query, limit: 500 });
  const header = [
    'Código',
    'Fecha',
    'Inicio',
    'Fin',
    'Cliente',
    'Correo',
    'Teléfono',
    'Servicio',
    'Profesional',
    'Estado',
    'Precio',
    'Notas',
  ];
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = [header.map(escapeCell).join(',')];
  for (const booking of bookings) {
    lines.push(
      [
        booking.code,
        booking.date,
        booking.start_time,
        booking.end_time,
        booking.customer_name,
        booking.customer_email,
        booking.customer_phone,
        booking.service.name,
        booking.resource.name,
        STATUS_LABELS[booking.status] || booking.status,
        booking.service.price,
        booking.notes,
      ]
        .map(escapeCell)
        .join(',')
    );
  }

  const filename = `reservas-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${lines.join('\r\n')}`);
});

router.get('/bookings', (req, res) => {
  res.json(listBookings(req.query));
});

router.patch('/bookings/:id/status', (req, res) => {
  const status = cleanText(req.body?.status, 20);
  const booking = updateBookingStatus(Number(req.params.id), status);
  res.json(adminBooking(booking));
});

/* ------------------------------- Ajustes --------------------------------- */

const SETTINGS_RULES = {
  business_name: { max: 60, min: 2 },
  business_tagline: { max: 160, min: 0 },
  currency_symbol: { max: 4, min: 1 },
  contact_email: { max: 160, min: 0 },
  contact_phone: { max: 40, min: 0 },
  address: { max: 120, min: 0 },
};

router.get('/settings', (req, res) => {
  const settings = getSettingsMap();
  delete settings.seeded;
  res.json(settings);
});

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const updates = {};

  for (const [key, rule] of Object.entries(SETTINGS_RULES)) {
    if (body[key] === undefined) continue;
    const value = cleanText(body[key], rule.max);
    if (value.length < rule.min) throw badRequest(`El campo ${key} no es válido`);
    if (key === 'contact_email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)) {
      throw badRequest('El correo de contacto no es válido');
    }
    updates[key] = value;
  }

  if (body.slot_interval !== undefined) {
    const value = Number.parseInt(body.slot_interval, 10);
    if (!Number.isInteger(value) || value < 5 || value > 120) {
      throw badRequest('El intervalo de turnos debe estar entre 5 y 120 minutos');
    }
    updates.slot_interval = String(value);
  }
  if (body.max_advance_days !== undefined) {
    const value = Number.parseInt(body.max_advance_days, 10);
    if (!Number.isInteger(value) || value < 1 || value > 365) {
      throw badRequest('La anticipación máxima debe estar entre 1 y 365 días');
    }
    updates.max_advance_days = String(value);
  }
  if (body.lead_time_minutes !== undefined) {
    const value = Number.parseInt(body.lead_time_minutes, 10);
    if (!Number.isInteger(value) || value < 0 || value > 1440) {
      throw badRequest('El tiempo mínimo de aviso no es válido');
    }
    updates.lead_time_minutes = String(value);
  }
  if (body.auto_confirm !== undefined) {
    updates.auto_confirm = parseActive(body.auto_confirm, 1) ? '1' : '0';
  }

  transaction(() => {
    const update = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    for (const [key, value] of Object.entries(updates)) update.run(key, value);
  });

  const settings = getSettingsMap();
  delete settings.seeded;
  res.json(settings);
});

module.exports = router;
