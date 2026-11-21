# ReservaFácil

Sistema de reservas multi-sector: sirve para cualquier negocio que trabaje con **servicios**, **recursos** (profesionales, salas, equipos…) y **citas**. Incluye una web pública de reservas y un panel de administración, con disponibilidad calculada automáticamente.

- Frontend: HTML, CSS y JavaScript sin frameworks.
- Backend: Node.js + Express.
- Base de datos: SQLite mediante el módulo nativo `node:sqlite`.
- Interfaz en español y diseño responsive.

---

## Requisitos

- **Node.js 22.13 o superior** (necesario para `node:sqlite`).
- npm.

> En Node 22/24 el módulo `node:sqlite` muestra un `ExperimentalWarning` al arrancar. Es normal y no afecta al funcionamiento.

## Instalación y arranque

```bash
npm install
npm start
```

Después abre:

| Zona | URL |
| --- | --- |
| Web pública | http://localhost:3000 |
| Panel de administración | http://localhost:3000/admin |

La primera vez se crea `data/reservas.db` y se cargan datos de demostración (servicios, recursos, horarios y reservas de ejemplo).

Para desarrollo con recarga automática:

```bash
npm run dev
```

## Acceso al panel

- Contraseña por defecto: **`admin123`**.
- Se recomienda cambiarla definiendo la variable de entorno `ADMIN_PASSWORD` antes de arrancar.

```bash
# Linux / macOS
ADMIN_PASSWORD="mi-clave-segura" npm start

# Windows (CMD)
set ADMIN_PASSWORD=mi-clave-segura
npm start
```

Si no se define, el servidor muestra una advertencia al iniciar.

## Variables de entorno

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP. |
| `HOST` | `0.0.0.0` | Interfaz de escucha. |
| `ADMIN_PASSWORD` | `admin123` | Contraseña del panel. |
| `COOKIE_SECURE` | — | `1` añade `Secure` a la cookie (úsalo con HTTPS). |
| `DATABASE_PATH` | `data/reservas.db` | Ruta alternativa del archivo SQLite. |

## Funciones principales

### Web pública

- Asistente de reserva en 4 pasos: servicio → profesional/recurso → fecha y hora → datos de contacto.
- Calendario mensual con días disponibles y selector de horarios.
- Opción **«Cualquiera disponible»** para asignar automáticamente el primer recurso libre.
- Cálculo de disponibilidad según horarios semanales, duración del servicio, intervalo de turnos, tiempo mínimo de aviso y anticipación máxima.
- Prevención de solapamientos por recurso.
- Confirmación con código de reserva y posibilidad de descargar un archivo `.ics` para el calendario.
- Consulta y cancelación pública de una reserva mediante su código.

### Panel de administración

- Inicio de sesión con sesión en memoria (cookie `HttpOnly`, `SameSite=Strict`, 12 h) y límite de intentos.
- Estadísticas: reservas de hoy, pendientes, ingresos estimados y próximas citas.
- Agenda con filtros por estado, fecha y búsqueda; detalle de cada reserva.
- Cambio de estado: pendiente, confirmada, completada y cancelada.
- Gestión de servicios: nombre, descripción, duración, precio, color y activación.
- Gestión de recursos/profesionales: datos de contacto, color, horarios semanales con descansos y activación.
- Exportación de reservas a CSV (compatible con Excel).
- Ajustes del negocio: nombre, eslogan, moneda, contacto, dirección, intervalo de turnos, anticipación máxima, aviso mínimo y auto-confirmación.

## Estructura del proyecto

```
.
├── server.js               # Arranque de Express, middlewares y rutas
├── package.json
├── data/
│   └── reservas.db         # Base de datos SQLite (se crea sola)
├── src/
│   ├── auth.js             # Sesiones, login y protección del panel
│   ├── db.js               # Esquema, ajustes por defecto y datos demo
│   ├── lib/
│   │   ├── availability.js # Cálculo de turnos y disponibilidad
│   │   ├── bookings.js     # Reservas, estados, búsquedas y estadísticas
│   │   ├── errors.js       # Errores HTTP
│   │   └── time.js         # Utilidades de fecha y hora
│   └── routes/
│       ├── admin.js        # API del panel (requiere sesión)
│       ├── auth.js         # Login/logout
│       └── public.js       # API pública
└── public/
    ├── index.html          # Web pública
    ├── admin.html          # Panel de administración
    ├── assets/             # Iconos y favicon
    ├── css/
    │   ├── styles.css      # Estilos generales y web pública
    │   └── admin.css       # Estilos del panel
    └── js/
        ├── app.js          # Lógica de la web pública
        └── admin.js        # Lógica del panel
```

## API

### Públicas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado del servicio. |
| `GET` | `/api/settings` | Ajustes visibles del negocio. |
| `GET` | `/api/services` | Servicios activos. |
| `GET` | `/api/resources` | Recursos activos con sus horarios. |
| `GET` | `/api/availability?serviceId=&resourceId=&date=` | Horarios libres de un día (`resourceId=any` para cualquiera). |
| `GET` | `/api/availability/month?serviceId=&resourceId=&month=YYYY-MM` | Días disponibles del mes. |
| `POST` | `/api/bookings` | Crear una reserva. |
| `GET` | `/api/bookings/code/:code` | Consultar una reserva por código. |
| `POST` | `/api/bookings/code/:code/cancel` | Cancelar una reserva por código. |

### Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Inicia sesión (`{ "password": "..." }`). |
| `POST` | `/api/auth/logout` | Cierra la sesión. |
| `GET` | `/api/auth/me` | Indica si la sesión está activa. |

### Administración (requiere sesión)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/admin/stats` | Estadísticas del panel. |
| `GET` | `/api/admin/bookings` | Lista de reservas con filtros. |
| `PATCH` | `/api/admin/bookings/:id/status` | Cambia el estado de una reserva. |
| `GET` | `/api/admin/bookings/export` | Exporta reservas a CSV. |
| `GET/POST` | `/api/admin/services` | Listar / crear servicios. |
| `PUT/DELETE` | `/api/admin/services/:id` | Editar / eliminar servicios. |
| `GET/POST` | `/api/admin/resources` | Listar / crear recursos. |
| `PUT/DELETE` | `/api/admin/resources/:id` | Editar / eliminar recursos y horarios. |
| `GET/PUT` | `/api/admin/settings` | Leer / guardar ajustes. |

## Estados de una reserva

| Estado | Significado |
| --- | --- |
| `pending` | Pendiente de confirmación. |
| `confirmed` | Confirmada. |
| `completed` | Atendida / finalizada. |
| `cancelled` | Cancelada por el cliente o el negocio. |

Con la auto-confirmación activa (por defecto), las reservas nuevas se crean como `confirmed`; si se desactiva, se crean como `pending`.

## Notas

- Las fechas se guardan como texto `YYYY-MM-DD` y las horas como `HH:MM`, usando la hora local del servidor.
- La base de datos se crea automáticamente en `data/`. Para empezar de cero, detén el servidor y elimina `data/reservas.db` (y sus archivos `-shm`/`-wal`); al arrancar de nuevo se regenerará con los datos demo.
- Las sesiones se guardan en memoria: al reiniciar el servidor hay que volver a iniciar sesión.
