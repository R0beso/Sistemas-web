'use strict';

const crypto = require('node:crypto');
const { db, getSettingsMap, transaction } = require('../db');
const { buildSlots, getConfig } = require('./availability');
const {
  addDays,
  isValidDate,
  minutesToTime,
  timeToMinutes,
  todayString,
  weekdayOf,
} = require('./time');
const { badRequest, conflict, notFound } = require('./errors');

const BOOKING_SELECT = `
  SELECT
    b.*,
    s.name AS service_name,
    s.duration_min AS service_duration,
    s.price AS service_price,
    s.color AS service_color,
    r.name AS resource_name,
    r.role AS resource_role,
    r.color AS resource_color
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  JOIN resources r ON r.id = b.resource_id
`;

function publicBooking(row) {
  if (!row) return null;
  return {
    code: row.code,
    status: row.status,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
    customer_name: row.customer_name,
    notes: row.notes,
    created_at: row.created_at,
    service: {
      id: row.service_id,
      name: row.service_name,
      duration_min: row.service_duration,
      price: row.service_price,
      color: row.service_color,
    },
    resource: {
      id: row.resource_id,
      name: row.resource_name,
      role: row.resource_role,
      color: row.resource_color,
    },
  };
}

function adminBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    ...publicBooking(row),
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    updated_at: row.updated_at,
  };
}

function getBookingByCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(normalized)) return null;
  return db.prepare(`${BOOKING_SELECT} WHERE b.code = ?`).get(normalized) || null;
}

function getBookingById(id) {
  return db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(Number(id)) || null;
}

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const exists = db.prepare('SELECT 1 FROM bookings WHERE code = ?');
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    if (!exists.get(code)) return code;
  }
  throw new Error('No se pudo generar un código de reserva');
}

function cleanText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function isValidPhone(value) {
  return /^[+()\d\s.-]{6,30}$/.test(value);
}

function createBooking(input) {
  const name = cleanText(input.customer_name, 100);
  const email = cleanText(input.customer_email, 160).toLowerCase();
  const phone = cleanText(input.customer_phone, 40);
  const notes = cleanText(input.notes, 500);
  const date = cleanText(input.date, 10);
  const startTime = cleanText(input.start_time, 5);
  const serviceId = Number(input.service_id);

  if (name.length < 2) throw badRequest('Escribe tu nombre completo');
  if (!email && !phone) throw badRequest('Indica un correo o un teléfono de contacto');
  if (email && !isValidEmail(email)) throw badRequest('El correo electrónico no es válido');
  if (phone && !isValidPhone(phone)) throw badRequest('El teléfono no es válido');
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw badRequest('Selecciona un servicio');
  if (!isValidDate(date)) throw badRequest('La fecha seleccionada no es válida');

  const start = timeToMinutes(startTime);
  if (!Number.isInteger(start)) throw badRequest('La hora seleccionada no es válida');

  const settings = getSettingsMap();
  const config = getConfig();
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(serviceId);
  if (!service) throw notFound('El servicio ya no está disponible');

  const today = todayString();
  if (date < today) throw badRequest('No puedes reservar en una fecha pasada');
  if (date > addDays(today, config.maxAdvanceDays)) {
    throw badRequest(`Solo puedes reservar con ${config.maxAdvanceDays} días de anticipación`);
  }

  const hasResource = input.resource_id !== undefined && input.resource_id !== null && input.resource_id !== '';
  let resourcePool = [];
  if (hasResource) {
    const resourceId = Number(input.resource_id);
    const resource = db
      .prepare('SELECT * FROM resources WHERE id = ? AND active = 1')
      .get(resourceId);
    if (!resource) throw notFound('El profesional o recurso ya no está disponible');
    resourcePool = [resource];
  } else {
    resourcePool = db.prepare('SELECT * FROM resources WHERE active = 1 ORDER BY name').all();
  }

  const status = settings.auto_confirm === '1' ? 'confirmed' : 'pending';

  return transaction(() => {
    let chosen = null;
    for (const resource of resourcePool) {
      const slots = buildSlots([resource], service, date, config);
      if (slots.has(start)) {
        chosen = resource;
        break;
      }
    }

    if (!chosen) {
      throw conflict('Ese horario acaba de ocuparse. Elige otro disponible.');
    }

    const endTime = minutesToTime(start + service.duration_min);
    const code = generateCode();

    const result = db
      .prepare(
        `INSERT INTO bookings (
          code, service_id, resource_id, customer_name, customer_email,
          customer_phone, date, start_time, end_time, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        code,
        serviceId,
        chosen.id,
        name,
        email,
        phone,
        date,
        minutesToTime(start),
        endTime,
        status,
        notes
      );

    return getBookingById(Number(result.lastInsertRowid));
  });
}

function isWithinSchedule(resourceId, date, startMinute, endMinute) {
  const weekday = weekdayOf(date);
  if (weekday === null) return false;
  const intervals = db
    .prepare(
      'SELECT start_time, end_time FROM schedules WHERE resource_id = ? AND weekday = ?'
    )
    .all(resourceId, weekday)
    .map((row) => [timeToMinutes(row.start_time), timeToMinutes(row.end_time)]);
  return intervals.some(([start, end]) => start <= startMinute && end >= endMinute);
}

function updateBookingStatus(id, status) {
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) throw badRequest('Estado inválido');

  const booking = getBookingById(id);
  if (!booking) throw notFound('Reserva no encontrada');

  if (status === 'confirmed' || status === 'pending') {
    const start = timeToMinutes(booking.start_time);
    const end = timeToMinutes(booking.end_time);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start >= end) {
      throw conflict('El horario de la reserva no es válido');
    }

    const overlapping = db
      .prepare(
        `SELECT 1 FROM bookings
         WHERE resource_id = ? AND date = ? AND id <> ?
           AND status IN ('pending', 'confirmed')
           AND start_time < ? AND end_time > ?`
      )
      .get(booking.resource_id, booking.date, booking.id, booking.end_time, booking.start_time);
    if (overlapping) throw conflict('Ya existe otra reserva en ese horario');

    if (!isWithinSchedule(booking.resource_id, booking.date, start, end)) {
      throw conflict('El horario está fuera de la agenda disponible del recurso');
    }
  }

  db.prepare(
    "UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, booking.id);

  return getBookingById(booking.id);
}

function cancelBookingByCode(code) {
  const booking = getBookingByCode(code);
  if (!booking) throw notFound('No encontramos una reserva con ese código');
  if (booking.status === 'cancelled') throw conflict('La reserva ya está cancelada');
  if (booking.status === 'completed') throw conflict('La reserva ya fue completada');

  const today = todayString();
  const start = timeToMinutes(booking.start_time);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (booking.date < today || (booking.date === today && start <= nowMin)) {
    throw conflict('No se puede cancelar una reserva que ya pasó');
  }

  db.prepare(
    "UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?"
  ).run(booking.id);

  return getBookingByCode(code);
}

function listBookings(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.date && isValidDate(filters.date)) {
    clauses.push('b.date = ?');
    params.push(filters.date);
  }
  if (filters.from && isValidDate(filters.from)) {
    clauses.push('b.date >= ?');
    params.push(filters.from);
  }
  if (filters.to && isValidDate(filters.to)) {
    clauses.push('b.date <= ?');
    params.push(filters.to);
  }
  if (filters.status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(filters.status)) {
    clauses.push('b.status = ?');
    params.push(filters.status);
  }
  if (filters.query) {
    const term = `%${String(filters.query).trim().slice(0, 60)}%`;
    clauses.push(
      '(b.customer_name LIKE ? OR b.customer_email LIKE ? OR b.customer_phone LIKE ? OR b.code LIKE ?)'
    );
    params.push(term, term, term, term);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 500);

  return db
    .prepare(
      `${BOOKING_SELECT} ${where} ORDER BY b.date DESC, b.start_time DESC LIMIT ${limit}`
    )
    .all(...params)
    .map(adminBooking);
}

function getStats() {
  const today = todayString();
  const nextWeek = addDays(today, 7);

  const todayCount = db
    .prepare(
      "SELECT COUNT(*) AS total FROM bookings WHERE date = ? AND status IN ('pending', 'confirmed')"
    )
    .get(today).total;

  const pendingCount = db
    .prepare(
      "SELECT COUNT(*) AS total FROM bookings WHERE date >= ? AND status = 'pending'"
    )
    .get(today).total;

  const nextWeekCount = db
    .prepare(
      "SELECT COUNT(*) AS total FROM bookings WHERE date >= ? AND date <= ? AND status IN ('pending', 'confirmed')"
    )
    .get(today, nextWeek).total;

  const revenueToday = db
    .prepare(
      `SELECT COALESCE(SUM(s.price), 0) AS total
       FROM bookings b JOIN services s ON s.id = b.service_id
       WHERE b.date = ? AND b.status IN ('pending', 'confirmed')`
    )
    .get(today).total;

  return {
    today,
    todayCount,
    pendingCount,
    nextWeekCount,
    revenueToday,
  };
}

module.exports = {
  adminBooking,
  cancelBookingByCode,
  createBooking,
  getBookingByCode,
  getBookingById,
  getStats,
  listBookings,
  publicBooking,
  updateBookingStatus,
};
