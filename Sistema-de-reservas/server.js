'use strict';

const path = require('node:path');
const express = require('express');
const { db, dbPath } = require('./src/db');
const { requireAuth, usingDefaultPassword } = require('./src/auth');
const authRoutes = require('./src/routes/auth');
const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '100kb' }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { maxAge: 0, etag: true }));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', requireAuth, adminRoutes);
app.use('/api', publicRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es válido' });
  }
  const status = Number(error.status) || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 ? 'Ocurrió un error inesperado' : error.message,
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('  ReservaFácil · Sistema de reservas');
  console.log(`  Sitio público: http://localhost:${PORT}`);
  console.log(`  Administración: http://localhost:${PORT}/admin`);
  console.log(`  Base de datos: ${dbPath}`);
  if (usingDefaultPassword()) {
    console.log('');
    console.log('  ⚠  Usando contraseña de administración por defecto: admin123');
    console.log('     Define ADMIN_PASSWORD para cambiarla.');
  }
  console.log('');
});

function shutdown() {
  server.close(() => {
    try {
      db.close();
    } catch {
      // La base de datos ya podría estar cerrada.
    }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
