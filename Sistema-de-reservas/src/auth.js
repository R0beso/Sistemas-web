'use strict';

const crypto = require('node:crypto');

const DEFAULT_PASSWORD = 'admin123';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = 'rf_session';

const sessions = new Map();
const loginAttempts = new Map();

function usingDefaultPassword() {
  return !process.env.ADMIN_PASSWORD;
}

function parseCookies(header = '') {
  const cookies = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { expiresAt });
  return { token, expiresAt };
}

function getSession(req) {
  const token = parseCookies(req.headers.cookie).rf_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Inicia sesión para continuar' });
  }
  req.session = session;
  next();
}

function sessionCookie(token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function expiredCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

function login(req, res) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, first: now };

  if (now - record.first > 10 * 60 * 1000) {
    record.count = 0;
    record.first = now;
  }
  if (record.count >= 8) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  }

  const password = String(req.body?.password ?? '');
  if (!safeEqual(password, ADMIN_PASSWORD)) {
    record.count += 1;
    loginAttempts.set(ip, record);
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  loginAttempts.delete(ip);
  const session = createSession();
  res.setHeader('Set-Cookie', sessionCookie(session.token));
  return res.json({ ok: true });
}

function logout(req, res) {
  const token = parseCookies(req.headers.cookie).rf_session;
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', expiredCookie());
  res.json({ ok: true });
}

module.exports = {
  ADMIN_PASSWORD,
  getSession,
  login,
  logout,
  requireAuth,
  usingDefaultPassword,
};
