'use strict';

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayString() {
  return toDateString(new Date());
}

function parseDateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, date };
}

function isValidDate(value) {
  return Boolean(parseDateParts(value));
}

function addDays(value, days) {
  const parts = parseDateParts(value);
  if (!parts) return null;
  const date = new Date(parts.date.getTime() + days * 86400000);
  return date.toISOString().slice(0, 10);
}

function weekdayOf(value) {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return parts.date.getUTCDay();
}

function timeToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

function nowMinutes() {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}

function formatDateEs(value) {
  const parts = parseDateParts(value);
  if (!parts) return value;
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parts.date);
}

module.exports = {
  addDays,
  formatDateEs,
  isValidDate,
  minutesToTime,
  nowMinutes,
  timeToMinutes,
  todayString,
  weekdayOf,
};
