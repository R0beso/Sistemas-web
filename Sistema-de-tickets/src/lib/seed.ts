import type { DatabaseSync } from "node:sqlite";
import type { TicketCategory, TicketPriority, TicketStatus } from "./constants";
import { hashPassword } from "./password";

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "AGENT" | "CLIENT";
}

interface SeedComment {
  author: string;
  body: string;
  internal?: boolean;
  afterHours: number;
}

interface SeedTicket {
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requester: string;
  assignee: string | null;
  hoursAgo: number;
  resolutionHours?: number;
  closedAfterHours?: number;
  comments?: SeedComment[];
}

const SEED_USERS: SeedUser[] = [
  { name: "Ana Torres", email: "admin@helpdesk.dev", password: "admin123", role: "ADMIN" },
  { name: "Carlos Ruiz", email: "carlos@helpdesk.dev", password: "agente123", role: "AGENT" },
  { name: "María López", email: "maria@helpdesk.dev", password: "agente123", role: "AGENT" },
  { name: "Diego Santos", email: "diego@helpdesk.dev", password: "agente123", role: "AGENT" },
  { name: "Juan Pérez", email: "cliente@helpdesk.dev", password: "cliente123", role: "CLIENT" },
  { name: "Lucía Gómez", email: "lucia@empresa.com", password: "cliente123", role: "CLIENT" },
  { name: "Andrés Molina", email: "andres@empresa.com", password: "cliente123", role: "CLIENT" },
];

const SEED_TICKETS: SeedTicket[] = [
  {
    subject: "No puedo iniciar sesión en el portal de clientes",
    description:
      "Desde esta mañana el portal me muestra “credenciales incorrectas”. He intentado restablecer la contraseña dos veces y el correo de recuperación no llega. Necesito entrar para revisar mis facturas.",
    status: "OPEN",
    priority: "HIGH",
    category: "ACCESO",
    requester: "cliente@helpdesk.dev",
    assignee: null,
    hoursAgo: 1,
    comments: [
      {
        author: "cliente@helpdesk.dev",
        body: "He revisado la carpeta de spam y tampoco aparece el correo. ¿Pueden ayudarme?",
        afterHours: 0.6,
      },
    ],
  },
  {
    subject: "La impresora del piso 3 no responde",
    description:
      "La impresora compartida del piso 3 aparece como desconectada. Ya la reinicié y sigue sin imprimir. Afecta a todo el equipo de marketing.",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    category: "HARDWARE",
    requester: "lucia@empresa.com",
    assignee: "carlos@helpdesk.dev",
    hoursAgo: 5,
    comments: [
      {
        author: "carlos@helpdesk.dev",
        body: "Estoy revisando la cola de impresión. Parece que hay varios trabajos atascados.",
        afterHours: 1,
      },
      {
        author: "carlos@helpdesk.dev",
        body: "Si persiste voy a actualizar el firmware del equipo. Pendiente de confirmar modelo exacto.",
        internal: true,
        afterHours: 1.5,
      },
      {
        author: "lucia@empresa.com",
        body: "Sigue sin imprimir, pero no es urgente. Gracias por la revisión.",
        afterHours: 3,
      },
    ],
  },
  {
    subject: "Error 500 al generar facturas",
    description:
      "Al pulsar “Generar factura” el sistema devuelve un error 500 y no descarga el PDF. Es un bloqueo total para el cierre de mes.",
    status: "IN_PROGRESS",
    priority: "URGENT",
    category: "SOFTWARE",
    requester: "andres@empresa.com",
    assignee: "maria@helpdesk.dev",
    hoursAgo: 3,
    comments: [
      {
        author: "andres@empresa.com",
        body: "Afecta a toda la facturación de fin de mes, necesitamos una solución hoy.",
        afterHours: 0.2,
      },
      {
        author: "maria@helpdesk.dev",
        body: "Ya identifiqué el error en el servicio que genera los PDFs. Estoy preparando el parche.",
        afterHours: 0.8,
      },
      {
        author: "maria@helpdesk.dev",
        body: "Escalado a desarrollo. Relacionado con INC-204 (cambio de plantilla de ayer).",
        internal: true,
        afterHours: 1,
      },
    ],
  },
  {
    subject: "Solicitud de nuevas cuentas para el equipo de ventas",
    description:
      "Necesitamos crear 4 cuentas nuevas para las incorporaciones del lunes. Adjunto por correo la lista con nombre, correo y rol de cada persona.",
    status: "PENDING",
    priority: "LOW",
    category: "ACCESO",
    requester: "lucia@empresa.com",
    assignee: "diego@helpdesk.dev",
    hoursAgo: 26,
    comments: [
      {
        author: "diego@helpdesk.dev",
        body: "Necesito la lista de correos y el rol que debe tener cada cuenta.",
        afterHours: 2,
      },
      {
        author: "lucia@empresa.com",
        body: "Enviado por correo. Quedamos atentos a la confirmación.",
        afterHours: 20,
      },
    ],
  },
  {
    subject: "Wi-Fi intermitente en la sala de reuniones",
    description:
      "La conexión Wi-Fi de la sala grande se cae cada pocos minutos, sobre todo durante las videollamadas. Ocurre con varios portátiles distintos.",
    status: "OPEN",
    priority: "HIGH",
    category: "RED",
    requester: "cliente@helpdesk.dev",
    assignee: null,
    hoursAgo: 8,
    comments: [
      {
        author: "cliente@helpdesk.dev",
        body: "Ocurre sobre todo por la mañana, cuando hay más gente conectada.",
        afterHours: 1,
      },
    ],
  },
  {
    subject: "Cambio de contraseña de correo corporativo",
    description:
      "Olvidé mi contraseña del correo corporativo y el teléfono de recuperación ya no lo tengo. Necesito restablecerla para acceder a mi bandeja.",
    status: "RESOLVED",
    priority: "MEDIUM",
    category: "ACCESO",
    requester: "andres@empresa.com",
    assignee: "carlos@helpdesk.dev",
    hoursAgo: 48,
    resolutionHours: 5,
    comments: [
      {
        author: "carlos@helpdesk.dev",
        body: "He enviado un enlace de restablecimiento a tu correo personal. Caduca en 30 minutos.",
        afterHours: 1,
      },
      {
        author: "andres@empresa.com",
        body: "Listo, ya pude entrar. ¡Gracias!",
        afterHours: 4,
      },
    ],
  },
  {
    subject: "La aplicación móvil se cierra al adjuntar archivos",
    description:
      "Cada vez que intento adjuntar una foto en la app móvil, esta se cierra sin mensaje de error. Ocurre desde la última actualización.",
    status: "OPEN",
    priority: "URGENT",
    category: "SOFTWARE",
    requester: "lucia@empresa.com",
    assignee: "maria@helpdesk.dev",
    hoursAgo: 2,
    comments: [
      {
        author: "lucia@empresa.com",
        body: "Adjunto captura del error por correo. Uso Android 14.",
        afterHours: 0.3,
      },
      {
        author: "maria@helpdesk.dev",
        body: "Reproducido en Android 14. Revisando permisos de almacenamiento en la nueva versión.",
        internal: true,
        afterHours: 0.7,
      },
    ],
  },
  {
    subject: "Renovación de licencia de antivirus",
    description:
      "La licencia del antivirus caduca en 10 días. Necesitamos renovar el plan para 45 equipos antes de que empiecen los avisos.",
    status: "PENDING",
    priority: "MEDIUM",
    category: "SOFTWARE",
    requester: "andres@empresa.com",
    assignee: "admin@helpdesk.dev",
    hoursAgo: 72,
    comments: [
      {
        author: "admin@helpdesk.dev",
        body: "La renovación requiere aprobación del departamento de compras.",
        afterHours: 3,
      },
      {
        author: "andres@empresa.com",
        body: "Compras ya lo aprobó ayer, debería estar en tu bandeja.",
        afterHours: 24,
      },
    ],
  },
  {
    subject: "El monitor secundario parpadea",
    description:
      "El segundo monitor parpadea de forma intermitente y a veces se apaga unos segundos. Ya probé a reconectar el cable.",
    status: "CLOSED",
    priority: "LOW",
    category: "HARDWARE",
    requester: "cliente@helpdesk.dev",
    assignee: "diego@helpdesk.dev",
    hoursAgo: 120,
    resolutionHours: 20,
    closedAfterHours: 26,
    comments: [
      {
        author: "diego@helpdesk.dev",
        body: "Probé con otro cable DisplayPort y el problema desapareció.",
        afterHours: 2,
      },
      {
        author: "cliente@helpdesk.dev",
        body: "Efectivamente era el cable. Gracias por la ayuda.",
        afterHours: 18,
      },
    ],
  },
  {
    subject: "Duplicado en el cobro de la mensualidad",
    description:
      "En el extracto bancario aparece el cobro de la mensualidad dos veces este mes. Necesito que revisen el cargo duplicado.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    category: "FACTURACION",
    requester: "lucia@empresa.com",
    assignee: "admin@helpdesk.dev",
    hoursAgo: 30,
    comments: [
      {
        author: "lucia@empresa.com",
        body: "El cobro aparece dos veces con el mismo identificador de operación.",
        afterHours: 1,
      },
      {
        author: "admin@helpdesk.dev",
        body: "Estamos verificando con el proveedor de pagos. Te confirmamos en cuanto tengamos respuesta.",
        afterHours: 4,
      },
      {
        author: "admin@helpdesk.dev",
        body: "Reembolso solicitado. Referencia RF-88213, plazo de 3 a 5 días hábiles.",
        internal: true,
        afterHours: 5,
      },
    ],
  },
  {
    subject: "La VPN no conecta desde casa",
    description:
      "Al intentar conectarme a la VPN desde mi red doméstica recibo el error 619. Con datos móviles sí funciona.",
    status: "OPEN",
    priority: "HIGH",
    category: "RED",
    requester: "andres@empresa.com",
    assignee: "carlos@helpdesk.dev",
    hoursAgo: 12,
    comments: [
      {
        author: "andres@empresa.com",
        body: "Error 619 al conectar. He reiniciado el router y sigue igual.",
        afterHours: 0.5,
      },
      {
        author: "carlos@helpdesk.dev",
        body: "Revisa que el cliente VPN esté actualizado, te dejo el enlace en un correo aparte.",
        afterHours: 2,
      },
    ],
  },
  {
    subject: "Actualizar datos de facturación",
    description:
      "Hemos cambiado de dirección fiscal y necesitamos que las próximas facturas salgan con los datos nuevos.",
    status: "RESOLVED",
    priority: "LOW",
    category: "FACTURACION",
    requester: "cliente@helpdesk.dev",
    assignee: "maria@helpdesk.dev",
    hoursAgo: 96,
    resolutionHours: 10,
    comments: [
      {
        author: "maria@helpdesk.dev",
        body: "Actualicé la dirección fiscal en el sistema. Se aplicará desde la próxima factura.",
        afterHours: 2,
      },
      {
        author: "cliente@helpdesk.dev",
        body: "Recibí la factura corregida, todo correcto. Gracias.",
        afterHours: 8,
      },
    ],
  },
  {
    subject: "El servidor de archivos está lento",
    description:
      "Abrir carpetas compartidas tarda varios minutos, sobre todo en las carpetas grandes de proyectos. Ayer funcionaba con normalidad.",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    category: "RED",
    requester: "andres@empresa.com",
    assignee: "diego@helpdesk.dev",
    hoursAgo: 20,
    comments: [
      {
        author: "diego@helpdesk.dev",
        body: "El servidor tiene picos de latencia. Estoy revisando la salud de los discos.",
        afterHours: 1,
      },
    ],
  },
  {
    subject: "Solicito acceso al repositorio de diseño",
    description:
      "Necesito permisos de lectura sobre el repositorio de diseño para preparar la presentación trimestral. Mi usuario es lucia@empresa.com.",
    status: "OPEN",
    priority: "LOW",
    category: "ACCESO",
    requester: "lucia@empresa.com",
    assignee: null,
    hoursAgo: 6,
  },
  {
    subject: "Pantalla azul al abrir el ERP",
    description:
      "El equipo de contabilidad muestra una pantalla azul al abrir el ERP. Después de reiniciar funciona unos minutos y vuelve a ocurrir.",
    status: "RESOLVED",
    priority: "URGENT",
    category: "SOFTWARE",
    requester: "cliente@helpdesk.dev",
    assignee: "carlos@helpdesk.dev",
    hoursAgo: 60,
    resolutionHours: 8,
    comments: [
      {
        author: "carlos@helpdesk.dev",
        body: "El ERP requiere una actualización de controladores. Programé la instalación esta tarde.",
        afterHours: 1,
      },
      {
        author: "cliente@helpdesk.dev",
        body: "Ya arranca sin problemas. Gracias por la rapidez.",
        afterHours: 6,
      },
    ],
  },
  {
    subject: "El correo de bienvenida no llega a nuevos empleados",
    description:
      "Las últimas tres incorporaciones no han recibido el correo de bienvenida con las credenciales iniciales.",
    status: "CLOSED",
    priority: "MEDIUM",
    category: "SOFTWARE",
    requester: "lucia@empresa.com",
    assignee: "maria@helpdesk.dev",
    hoursAgo: 168,
    resolutionHours: 30,
    closedAfterHours: 48,
    comments: [
      {
        author: "maria@helpdesk.dev",
        body: "El flujo de bienvenida tenía un filtro mal configurado. Ya está corregido.",
        afterHours: 3,
      },
      {
        author: "lucia@empresa.com",
        body: "Confirmado con el nuevo empleado, el correo llegó correctamente.",
        afterHours: 24,
      },
    ],
  },
  {
    subject: "Necesito una laptop de reemplazo",
    description:
      "La batería de mi laptop no carga y necesito trabajar mañana desde la oficina. ¿Es posible un equipo de reemplazo temporal?",
    status: "OPEN",
    priority: "MEDIUM",
    category: "HARDWARE",
    requester: "andres@empresa.com",
    assignee: "admin@helpdesk.dev",
    hoursAgo: 4,
    comments: [
      {
        author: "andres@empresa.com",
        body: "La batería no carga y necesito trabajar mañana. ¿Hay algún equipo disponible?",
        afterHours: 1,
      },
    ],
  },
  {
    subject: "Configurar firma de correo corporativa",
    description:
      "Quiero añadir la firma corporativa con logo y datos de contacto a mi cuenta de correo.",
    status: "CLOSED",
    priority: "LOW",
    category: "OTRO",
    requester: "cliente@helpdesk.dev",
    assignee: "diego@helpdesk.dev",
    hoursAgo: 200,
    resolutionHours: 4,
    closedAfterHours: 6,
    comments: [
      {
        author: "diego@helpdesk.dev",
        body: "Firma configurada y sincronizada en todos tus dispositivos.",
        afterHours: 2,
      },
    ],
  },
  {
    subject: "Caída del sistema de reservas",
    description:
      "El sistema de reservas no carga desde las 9:00. Los clientes no pueden completar reservas y estamos perdiendo ventas.",
    status: "RESOLVED",
    priority: "URGENT",
    category: "SOFTWARE",
    requester: "lucia@empresa.com",
    assignee: "admin@helpdesk.dev",
    hoursAgo: 36,
    resolutionHours: 6,
    comments: [
      {
        author: "admin@helpdesk.dev",
        body: "El sistema de reservas volvió a estar en línea. Estamos revisando la causa raíz.",
        afterHours: 1,
      },
      {
        author: "lucia@empresa.com",
        body: "Gracias por la rapidez, ya podemos reservar de nuevo.",
        afterHours: 4,
      },
    ],
  },
  {
    subject: "Consulta sobre el plan de soporte",
    description:
      "Quería saber si nuestro plan actual incluye soporte 24/7 y cuál es el tiempo de respuesta para incidencias urgentes.",
    status: "OPEN",
    priority: "LOW",
    category: "OTRO",
    requester: "cliente@helpdesk.dev",
    assignee: null,
    hoursAgo: 0.5,
    comments: [
      {
        author: "cliente@helpdesk.dev",
        body: "También me interesa saber si se puede ampliar la cobertura.",
        afterHours: 0.2,
      },
    ],
  },
];

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En progreso",
  PENDING: "En espera",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
};

export function seedDatabase(db: DatabaseSync): void {
  const now = Date.now();
  const iso = (hoursAgo: number) => new Date(now - hoursAgo * 3_600_000).toISOString();

  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
  );
  const insertTicket = db.prepare(
    `INSERT INTO tickets
      (subject, description, status, priority, category, requester_id, assignee_id,
       created_at, updated_at, resolved_at, closed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertComment = db.prepare(
    "INSERT INTO comments (ticket_id, author_id, body, internal, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertActivity = db.prepare(
    "INSERT INTO activities (ticket_id, actor_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  db.exec("BEGIN");
  try {
    const userIds = new Map<string, number>();
    for (const user of SEED_USERS) {
      const result = insertUser.run(
        user.name,
        user.email,
        hashPassword(user.password),
        user.role,
        iso(24 * 365),
      );
      userIds.set(user.email, Number(result.lastInsertRowid));
    }

    for (const ticket of SEED_TICKETS) {
      const requesterId = userIds.get(ticket.requester);
      if (!requesterId) continue;
      const assigneeId = ticket.assignee ? (userIds.get(ticket.assignee) ?? null) : null;
      const createdAt = iso(ticket.hoursAgo);

      let resolvedAt: string | null = null;
      let closedAt: string | null = null;
      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
        const resolutionHours = ticket.resolutionHours ?? Math.max(1, ticket.hoursAgo / 2);
        resolvedAt = iso(Math.max(0.1, ticket.hoursAgo - resolutionHours));
      }
      if (ticket.status === "CLOSED") {
        const closedHours = ticket.closedAfterHours ?? Math.max(0.5, ticket.hoursAgo / 2);
        closedAt = iso(Math.max(0.05, ticket.hoursAgo - closedHours));
      }

      const result = insertTicket.run(
        ticket.subject,
        ticket.description,
        ticket.status,
        ticket.priority,
        ticket.category,
        requesterId,
        assigneeId,
        createdAt,
        createdAt,
        resolvedAt,
        closedAt,
      );
      const ticketId = Number(result.lastInsertRowid);

      let lastActivity = createdAt;
      const touch = (value: string) => {
        if (value > lastActivity) lastActivity = value;
      };

      insertActivity.run(
        ticketId,
        requesterId,
        "CREATED",
        `Ticket creado por ${SEED_USERS.find((u) => u.email === ticket.requester)?.name ?? "el cliente"}`,
        createdAt,
      );

      if (assigneeId) {
        const assignedAt = iso(Math.max(0.05, ticket.hoursAgo - 0.3));
        insertActivity.run(
          ticketId,
          assigneeId,
          "ASSIGNED",
          `Asignado a ${SEED_USERS.find((u) => u.email === ticket.assignee)?.name ?? "un agente"}`,
          assignedAt,
        );
        touch(assignedAt);
      }

      if (ticket.status !== "OPEN") {
        const changedAt = resolvedAt ?? iso(Math.max(0.1, ticket.hoursAgo - 1));
        insertActivity.run(
          ticketId,
          assigneeId,
          "STATUS",
          `Estado cambiado de ${STATUS_LABELS.OPEN} a ${STATUS_LABELS[ticket.status]}`,
          changedAt,
        );
        touch(changedAt);
      }

      if (closedAt) {
        insertActivity.run(
          ticketId,
          assigneeId,
          "STATUS",
          `Estado cambiado de ${STATUS_LABELS.RESOLVED} a ${STATUS_LABELS.CLOSED}`,
          closedAt,
        );
        touch(closedAt);
      }

      for (const comment of ticket.comments ?? []) {
        const authorId = userIds.get(comment.author);
        if (!authorId) continue;
        const commentAt = iso(Math.max(0.01, ticket.hoursAgo - comment.afterHours));
        insertComment.run(ticketId, authorId, comment.body, comment.internal ? 1 : 0, commentAt);
        insertActivity.run(
          ticketId,
          authorId,
          comment.internal ? "NOTE" : "COMMENT",
          comment.internal ? "Añadió una nota interna" : "Respondió al ticket",
          commentAt,
        );
        touch(commentAt);
      }

      db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(lastActivity, ticketId);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
