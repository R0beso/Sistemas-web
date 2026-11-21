'use strict';

const express = require('express');
const { db, getSettingsMap } = require('../db');
const { getAvailability, getMonthAvailability } = require('../lib/availability');
const {
  cancelBookingByCode,
  createBooking,
  getBookingByCode,
  publicBooking,
} = require('../lib/bookings');
const { notFound } = require('../lib/errors');

const router = express.Router();

const PUBLIC_SETTINGS = [
  'business_name',
  'business_tagline',
  'currency_symbol',
  'slot_interval',
  'max_advance_days',
  'lead_time_minutes',
  'auto_confirm',
  'contact_email',
  'contact_phone',
  'address',
];

router.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

router.get('/settings', (req, res) => {
  const settings = getSettingsMap();
  const payload = {};
  for (const key of PUBLIC_SETTINGS) payload[key] = settings[key];
  res.json(payload);
});

router.get('/services', (req, res) => {
  const services = db
    .prepare(
      'SELECT id, name, description, duration_min, price, color FROM services WHERE active = 1 ORDER BY id'
    )
    .all();
  res.json(services);
});

router.get('/resources', (req, res) => {
  const resources = db
    .prepare(
      'SELECT id, name, role, color FROM resources WHERE active = 1 ORDER BY name'
    )
    .all();

  const schedules = db
    .prepare(
      `SELECT s.resource_id, s.weekday, s.start_time, s.end_time
       FROM schedules s
       JOIN resources r ON r.id = s.resource_id
       WHERE r.active = 1
       ORDER BY s.weekday, s.start_time`
    )
    .all();

  const byResource = new Map();
  for (const row of schedules) {
    if (!byResource.has(row.resource_id)) byResource.set(row.resource_id, []);
    byResource.get(row.resource_id).push({
      weekday: row.weekday,
      start_time: row.start_time,
      end_time: row.end_time,
    });
  }

  res.json(
    resources.map((resource) => ({
      ...resource,
      schedules: byResource.get(resource.id) || [],
    }))
  );
});

router.get('/availability', (req, res) => {
  const { serviceId, resourceId, date } = req.query;
  res.json(
    getAvailability({
      serviceId,
      resourceId: resourceId === 'any' ? null : resourceId,
      date,
    })
  );
});

router.get('/availability/month', (req, res) => {
  const { serviceId, resourceId, month } = req.query;
  res.json(
    getMonthAvailability({
      serviceId,
      resourceId: resourceId === 'any' ? null : resourceId,
      month,
    })
  );
});

router.post('/bookings', (req, res) => {
  const booking = createBooking(req.body || {});
  res.status(201).json({ booking: publicBooking(booking) });
});

router.get('/bookings/code/:code', (req, res) => {
  const booking = getBookingByCode(req.params.code);
  if (!booking) throw notFound('No encontramos una reserva con ese código');
  res.json({ booking: publicBooking(booking) });
});

router.post('/bookings/code/:code/cancel', (req, res) => {
  const booking = cancelBookingByCode(req.params.code);
  res.json({ booking: publicBooking(booking) });
});

module.exports = router;
