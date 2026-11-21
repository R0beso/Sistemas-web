'use strict';

const { db, getSettingsMap } = require('../db');
const { addDays, isValidDate, minutesToTime, nowMinutes, timeToMinutes, todayString, weekdayOf } = require('./time');
const { badRequest, notFound } = require('./errors');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getConfig() {
  const settings = getSettingsMap();
  return {
    slotInterval: clamp(Number.parseInt(settings.slot_interval, 10) || 30, 5, 120),
    maxAdvanceDays: clamp(Number.parseInt(settings.max_advance_days, 10) || 60, 1, 365),
    leadTimeMinutes: clamp(Number.parseInt(settings.lead_time_minutes, 10) || 0, 0, 1440),
  };
}

function getService(serviceId) {
  const id = Number(serviceId);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Servicio inválido');
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(id);
  if (!service) throw notFound('Servicio no encontrado o inactivo');
  return service;
}

function getResources(resourceId) {
  if (resourceId === undefined || resourceId === null || resourceId === '' || resourceId === 0 || resourceId === '0') {
    return db.prepare('SELECT * FROM resources WHERE active = 1 ORDER BY name').all();
  }
  const id = Number(resourceId);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Profesional o recurso inválido');
  const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND active = 1').get(id);
  if (!resource) throw notFound('Profesional o recurso no encontrado');
  return [resource];
}

function getDayIntervals(resourceId, date) {
  const weekday = weekdayOf(date);
  const rows = db
    .prepare(
      'SELECT start_time, end_time FROM schedules WHERE resource_id = ? AND weekday = ? ORDER BY start_time'
    )
    .all(resourceId, weekday);
  return rows
    .map((row) => [timeToMinutes(row.start_time), timeToMinutes(row.end_time)])
    .filter(([start, end]) => Number.isInteger(start) && Number.isInteger(end) && start < end)
    .sort((a, b) => a[0] - b[0]);
}

function getBookedRanges(resourceId, date) {
  return db
    .prepare(
      "SELECT start_time, end_time FROM bookings WHERE resource_id = ? AND date = ? AND status IN ('pending', 'confirmed')"
    )
    .all(resourceId, date)
    .map((row) => [timeToMinutes(row.start_time), timeToMinutes(row.end_time)])
    .filter(([start, end]) => Number.isInteger(start) && Number.isInteger(end));
}

/**
 * Returns a Map of startMinute -> { resources: [{id, name}] } for one or more resources.
 */
function buildSlots(resources, service, date, config) {
  const slots = new Map();
  if (!isValidDate(date)) return slots;

  const today = todayString();
  if (date < today) return slots;
  if (date > addDays(today, config.maxAdvanceDays)) return slots;

  const minimumStart = date === today ? nowMinutes() + config.leadTimeMinutes : 0;
  const duration = service.duration_min;

  for (const resource of resources) {
    const intervals = getDayIntervals(resource.id, date);
    if (intervals.length === 0) continue;

    const occupied = getBookedRanges(resource.id, date);

    for (const [intervalStart, intervalEnd] of intervals) {
      for (
        let start = intervalStart;
        start + duration <= intervalEnd;
        start += config.slotInterval
      ) {
        if (start < minimumStart) continue;
        const end = start + duration;
        const overlaps = occupied.some(
          ([bookedStart, bookedEnd]) => start < bookedEnd && bookedStart < end
        );
        if (overlaps) continue;

        if (!slots.has(start)) slots.set(start, []);
        const list = slots.get(start);
        if (!list.some((item) => item.id === resource.id)) {
          list.push({ id: resource.id, name: resource.name });
        }
      }
    }
  }

  return slots;
}

function publicSlotList(slots, duration) {
  return [...slots.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, resources]) => ({
      time: minutesToTime(start),
      endTime: minutesToTime(start + duration),
      resources: resources.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }));
}

function getAvailability({ serviceId, resourceId, date }) {
  if (!isValidDate(date || '')) throw badRequest('La fecha no es válida');
  const service = getService(serviceId);
  const resources = getResources(resourceId);
  const config = getConfig();
  const slots = buildSlots(resources, service, date, config);

  return {
    date,
    serviceId: service.id,
    duration: service.duration_min,
    slots: publicSlotList(slots, service.duration_min),
  };
}

function getMonthAvailability({ serviceId, resourceId, month }) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  if (!match) throw badRequest('El mes no es válido');

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw badRequest('El mes no es válido');

  const service = getService(serviceId);
  const resources = getResources(resourceId);
  const config = getConfig();

  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const today = todayString();
  const maxDate = addDays(today, config.maxAdvanceDays);
  const days = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (date < today || date > maxDate) {
      days[date] = 0;
      continue;
    }
    days[date] = buildSlots(resources, service, date, config).size;
  }

  return {
    month,
    serviceId: service.id,
    duration: service.duration_min,
    maxDate,
    days,
  };
}

module.exports = {
  buildSlots,
  getAvailability,
  getConfig,
  getMonthAvailability,
  getResources,
  getService,
};
