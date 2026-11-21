# Mesa de Ayuda — Sistema de tickets

Helpdesk completo construido con **Next.js 16**, **React 19**, **Tailwind CSS 4** y **SQLite**
(usando el módulo nativo `node:sqlite`, sin dependencias nativas externas).

Incluye autenticación con roles, dashboard con métricas, gestión de tickets, conversaciones con
notas internas y administración de usuarios.

## Características

- **Autenticación y roles**: administrador, agente y cliente. Sesiones persistidas en SQLite con
  cookie `httpOnly`.
- **Dashboard**: tickets activos, sin asignar, urgentes, resueltos en 7 días, tiempo medio de
  resolución, gráfico semanal, distribución por estado, carga del equipo y actividad reciente.
- **Tickets**: creación, búsqueda, filtros por estado/prioridad/categoría/asignación, paginación y
  orden por última actualización.
- **Detalle del ticket**: descripción, conversación unificada con historial de cambios, respuestas
  públicas y **notas internas** (solo agentes/admin), cambio de estado, prioridad, categoría y
  asignación, además de acciones rápidas (tomar, resolver, cerrar, reabrir).
- **Permisos**: los clientes solo ven y comentan sus propios tickets; los agentes ven todo el
  sistema; los administradores además gestionan usuarios.
- **Usuarios**: alta de usuarios, cambio de rol, activación/desactivación y restablecimiento de
  contraseña con cierre de sesiones.
- **Datos de ejemplo**: la base de datos se crea y se rellena automáticamente la primera vez.
- **Diseño responsive** con menú lateral, vista móvil y estados vacíos cuidados.

## Requisitos

- Node.js **22.13+** (recomendado **24**), ya que usa `node:sqlite`.
- npm.

> En Node 24 `node:sqlite` funciona sin flags, aunque puede mostrar un aviso
> `ExperimentalWarning: SQLite is an experimental feature`. Es inofensivo.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

Para producción:

```bash
npm run build
npm start
```

## Cuentas de demostración

| Rol           | Correo                 | Contraseña   |
| ------------- | ---------------------- | ------------ |
| Administrador | `admin@helpdesk.dev`   | `admin123`   |
| Agente        | `carlos@helpdesk.dev`  | `agente123`  |
| Agente        | `maria@helpdesk.dev`   | `agente123`  |
| Cliente       | `cliente@helpdesk.dev` | `cliente123` |
| Cliente       | `lucia@empresa.com`    | `cliente123` |

En la pantalla de login también hay botones de acceso rápido para las tres cuentas principales.

## Scripts

| Script              | Descripción                                 |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo.                     |
| `npm run build`     | Compila la aplicación para producción.      |
| `npm start`         | Sirve la build de producción.               |
| `npm run typecheck` | Comprueba los tipos con TypeScript.         |

## Base de datos

- Ruta por defecto: `data/helpdesk.db` (se crea sola).
- Se puede cambiar con la variable de entorno `DATABASE_PATH`.
- El esquema se migra al arrancar (`CREATE TABLE IF NOT EXISTS`).
- Si no hay usuarios, se ejecuta el seed con usuarios, tickets, comentarios e historial.
- Para reiniciar la demo: detén el servidor y borra la carpeta `data/`.

```bash
rm -rf data
```

## Estructura

```
src/
├── actions/            # Server Actions (auth, tickets, usuarios)
├── app/
│   ├── (app)/          # Zona autenticada (layout con sidebar)
│   │   ├── page.tsx            # Dashboard
│   │   ├── tickets/            # Listado, creación y detalle
│   │   └── users/              # Administración de usuarios
│   ├── login/          # Inicio de sesión
│   ├── globals.css     # Tailwind + sistema de diseño
│   └── layout.tsx
├── components/         # UI reutilizable (tabla, gráficos, shell, etc.)
└── lib/
    ├── auth.ts         # Sesiones, login/logout y guards de permisos
    ├── db.ts           # Conexión y esquema SQLite
    ├── seed.ts         # Datos de demostración
    ├── tickets.ts      # Consultas de tickets y dashboard
    ├── users.ts        # Consultas y mutaciones de usuarios
    ├── constants.ts    # Estados, prioridades, categorías y roles
    ├── password.ts     # Hash scrypt
    └── format.ts       # Fechas, duraciones y avatares
```

## Seguridad

- Contraseñas con **scrypt** (sal aleatoria por usuario) y comparación en tiempo constante.
- Sesiones con token aleatorio de 32 bytes almacenado en SQLite y cookie `httpOnly`, `sameSite=lax`
  y `secure` cuando la petición llega por HTTPS (cabecera `x-forwarded-proto`).
- Todas las acciones y consultas comprueban permisos en el servidor; los clientes nunca pueden leer
  tickets ajenos ni notas internas.
- Validación de formularios con Zod.
