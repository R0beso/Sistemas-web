'use strict';

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                */
/* -------------------------------------------------------------------------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ICONS = '/assets/icons.svg';
const icon = (name, className = 'icon') =>
  `<svg class="${className}" aria-hidden="true"><use href="${ICONS}#i-${name}"></use></svg>`;

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const VIEW_TITLES = {
  reservas: 'Reservas',
  servicios: 'Servicios',
  equipo: 'Equipo y recursos',
  ajustes: 'Ajustes',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[character];
  });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function todayString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDaysToDate(value, days) {
  const base = value || todayString();
  const [year, month, day] = base.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatDateLong(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  const label = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateShort(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  const symbol = admin.settings.currency_symbol || '$';
  return `${symbol}${amount.toLocaleString('es-ES', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();
}

function statusLabel(status) {
  return (
    {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      completed: 'Completada',
    }[status] || status
  );
}

function statusBadge(status) {
  return `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`;
}

async function requestJSON(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const error = new Error(data.error || 'No se pudo completar la solicitud');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function apiAdmin(url, options = {}) {
  try {
    return await requestJSON(url, options);
  } catch (error) {
    if (error.status === 401) showLogin('Tu sesión expiró. Inicia sesión de nuevo.');
    throw error;
  }
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* -------------------------------------------------------------------------- */
/*  Estado                                                                    */
/* -------------------------------------------------------------------------- */

const admin = {
  view: 'reservas',
  services: [],
  resources: [],
  settings: {},
  stats: null,
  bookings: [],
  bookingsLoading: false,
  bookingsError: null,
  filters: {
    date: todayString(),
    status: '',
    query: '',
  },
};

let modalRoot;
let searchTimer = null;

/* -------------------------------------------------------------------------- */
/*  Inicialización                                                            */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  modalRoot = $('#admin-modal-root');
  $('#filter-date').value = admin.filters.date;
  $('#today-chip').textContent = formatDateLong(todayString());
  bindEvents();

  try {
    const session = await requestJSON('/api/auth/me');
    if (session.authenticated) {
      showApp();
      await loadAll();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin(message = '') {
  closeModal();
  $('#login-screen').hidden = false;
  $('#admin-app').hidden = true;
  const errorBox = $('#login-error');
  if (message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  } else {
    errorBox.hidden = true;
  }
  const password = $('#login-password');
  if (password) {
    password.value = '';
    setTimeout(() => password.focus(), 60);
  }
}

function showApp() {
  $('#login-screen').hidden = true;
  $('#admin-app').hidden = false;
  $('#login-error').hidden = true;
}

async function loadAll() {
  try {
    const [services, resources, settings, stats] = await Promise.all([
      apiAdmin('/api/admin/services'),
      apiAdmin('/api/admin/resources'),
      apiAdmin('/api/admin/settings'),
      apiAdmin('/api/admin/stats'),
    ]);
    admin.services = services;
    admin.resources = resources;
    admin.settings = settings;
    admin.stats = stats;

    applySettingsToPage();
    renderStats();
    renderServices();
    renderResources();
    fillSettingsForm();
    await loadBookings();
  } catch (error) {
    if (error.status !== 401) toast(error.message, 'error');
  }
}

function applySettingsToPage() {
  const name = admin.settings.business_name || 'ReservaFácil';
  $$('[data-brand-name]').forEach((element) => {
    element.textContent = name;
  });
  document.title = `${VIEW_TITLES[admin.view]} · ${name}`;
}

/* -------------------------------------------------------------------------- */
/*  Eventos                                                                   */
/* -------------------------------------------------------------------------- */

function bindEvents() {
  $('#login-form').addEventListener('submit', handleLogin);
  $('#logout-btn').addEventListener('click', handleLogout);
  $('#logout-btn-2').addEventListener('click', handleLogout);

  $$('.nav-item[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  $('#refresh-btn').addEventListener('click', refreshBookings);
  $('#export-btn').addEventListener('click', exportCsv);

  $('#filter-date').addEventListener('change', (event) => {
    admin.filters.date = event.target.value;
    loadBookings();
  });

  $('#prev-day').addEventListener('click', () => {
    const base = admin.filters.date || todayString();
    setFilterDate(addDaysToDate(base, -1));
  });

  $('#next-day').addEventListener('click', () => {
    const base = admin.filters.date || todayString();
    setFilterDate(addDaysToDate(base, 1));
  });

  $('#today-btn').addEventListener('click', () => setFilterDate(todayString()));

  $('#filter-status').addEventListener('change', (event) => {
    admin.filters.status = event.target.value;
    loadBookings();
  });

  $('#filter-query').addEventListener('input', (event) => {
    const value = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      admin.filters.query = value.trim();
      loadBookings();
    }, 320);
  });

  $('#clear-filters').addEventListener('click', () => {
    admin.filters = { date: '', status: '', query: '' };
    $('#filter-date').value = '';
    $('#filter-status').value = '';
    $('#filter-query').value = '';
    loadBookings();
  });

  $('#new-service-btn').addEventListener('click', () => openServiceModal());
  $('#new-resource-btn').addEventListener('click', () => openResourceModal());

  $('#services-grid').addEventListener('click', handleServiceGridClick);
  $('#resources-grid').addEventListener('click', handleResourceGridClick);

  $('#settings-form').addEventListener('submit', handleSettingsSubmit);

  document.addEventListener('click', handleBookingActions);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const button = $('#login-submit');
  const errorBox = $('#login-error');
  const password = $('#login-password').value;
  button.disabled = true;
  errorBox.hidden = true;

  try {
    await requestJSON('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    showApp();
    await loadAll();
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    $('#login-password').select();
  } finally {
    button.disabled = false;
    form.reset();
  }
}

async function handleLogout() {
  try {
    await requestJSON('/api/auth/logout', { method: 'POST' });
  } catch {
    // La sesión se cierra localmente aunque la petición falle.
  }
  showLogin();
}

function switchView(view) {
  admin.view = view;
  $$('.nav-item[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === view);
  });
  $$('.view').forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });
  $('#view-title').textContent = VIEW_TITLES[view];
  document.title = `${VIEW_TITLES[view]} · ${admin.settings.business_name || 'ReservaFácil'}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFilterDate(date) {
  admin.filters.date = date;
  $('#filter-date').value = date;
  loadBookings();
}

/* -------------------------------------------------------------------------- */
/*  Datos de reservas                                                         */
/* -------------------------------------------------------------------------- */

async function loadBookings() {
  admin.bookingsLoading = true;
  admin.bookingsError = null;
  renderBookings();

  const params = new URLSearchParams();
  if (admin.filters.date) params.set('date', admin.filters.date);
  if (admin.filters.status) params.set('status', admin.filters.status);
  if (admin.filters.query) params.set('query', admin.filters.query);

  try {
    const data = await apiAdmin(`/api/admin/bookings?${params.toString()}`);
    admin.bookings = data;
    admin.bookingsLoading = false;
    renderBookings();
  } catch (error) {
    admin.bookingsLoading = false;
    admin.bookingsError = error.message;
    renderBookings();
  }
}

async function refreshBookings() {
  const button = $('#refresh-btn');
  button.disabled = true;
  const iconElement = $('.icon', button);
  if (iconElement) iconElement.style.animation = 'spin 0.8s linear infinite';
  try {
    await Promise.all([loadBookings(), loadStats()]);
    toast('Agenda actualizada', 'success');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
    if (iconElement) iconElement.style.animation = '';
  }
}

async function loadStats() {
  try {
    admin.stats = await apiAdmin('/api/admin/stats');
    renderStats();
  } catch (error) {
    if (error.status !== 401) toast(error.message, 'error');
  }
}

/* -------------------------------------------------------------------------- */
/*  Render · estadísticas                                                     */
/* -------------------------------------------------------------------------- */

function renderStats() {
  const container = $('#stats-grid');
  const stats = admin.stats;
  if (!stats) {
    container.innerHTML = Array.from(
      { length: 4 },
      () => '<article class="stat-card"><div class="skeleton" style="height:88px"></div></article>'
    ).join('');
    return;
  }

  const cards = [
    {
      label: 'Reservas hoy',
      value: stats.todayCount,
      sub: formatDateShort(stats.today),
      icon: 'calendar',
      variant: 'indigo',
    },
    {
      label: 'Pendientes',
      value: stats.pendingCount,
      sub: 'Requieren confirmación',
      icon: 'clock',
      variant: 'orange',
    },
    {
      label: 'Próximos 7 días',
      value: stats.nextWeekCount,
      sub: 'Citas activas',
      icon: 'users',
      variant: 'sky',
    },
    {
      label: 'Ingresos hoy',
      value: formatMoney(stats.revenueToday),
      sub: 'Importe estimado',
      icon: 'coins',
      variant: 'green',
    },
  ];

  container.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <div class="stat-top">
            <span class="stat-label">${escapeHtml(card.label)}</span>
            <span class="stat-icon stat-icon--${card.variant}">${icon(card.icon)}</span>
          </div>
          <strong class="stat-value">${escapeHtml(card.value)}</strong>
          <span class="stat-sub">${escapeHtml(card.sub)}</span>
        </article>`
    )
    .join('');
}

/* -------------------------------------------------------------------------- */
/*  Render · tabla de reservas                                                */
/* -------------------------------------------------------------------------- */

function renderBookings() {
  const container = $('#bookings-list');
  const caption = $('#bookings-caption');

  if (admin.bookingsLoading) {
    caption.textContent = 'Cargando reservas…';
    container.innerHTML = `
      <div class="loading-state" style="min-height:280px">
        <span class="spinner"></span>
        <p>Cargando reservas…</p>
      </div>`;
    return;
  }

  if (admin.bookingsError) {
    caption.textContent = 'No se pudieron cargar las reservas';
    container.innerHTML = `
      <div class="empty-state" style="min-height:240px">
        ${icon('alert')}
        <h3>Ocurrió un problema</h3>
        <p>${escapeHtml(admin.bookingsError)}</p>
        <button class="btn btn-primary btn-sm" type="button" onclick="location.reload()">Reintentar</button>
      </div>`;
    return;
  }

  const bookings = admin.bookings;
  const total = bookings
    .filter((booking) => booking.status !== 'cancelled')
    .reduce((sum, booking) => sum + Number(booking.service.price || 0), 0);

  let captionText = '';
  if (admin.filters.date) captionText += `${formatDateLong(admin.filters.date)} · `;
  else captionText += 'Todas las fechas · ';
  captionText += `${bookings.length} ${bookings.length === 1 ? 'reserva' : 'reservas'} · ${formatMoney(total)} estimado`;
  caption.textContent = captionText;

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="min-height:260px">
        ${icon('calendar')}
        <h3>No hay reservas</h3>
        <p>${
          admin.filters.query || admin.filters.status
            ? 'No encontramos reservas con estos filtros. Prueba a limpiarlos.'
            : admin.filters.date
              ? 'No hay reservas para este día. Prueba con otra fecha.'
              : 'Todavía no hay reservas registradas.'
        }</p>
        <button class="btn btn-soft btn-sm" type="button" id="empty-clear-filters">Limpiar filtros</button>
      </div>`;
    const clear = $('#empty-clear-filters');
    if (clear) {
      clear.addEventListener('click', () => {
        admin.filters = { date: '', status: '', query: '' };
        $('#filter-date').value = '';
        $('#filter-status').value = '';
        $('#filter-query').value = '';
        loadBookings();
      });
    }
    return;
  }

  const rows = bookings
    .map((booking) => {
      const contact = booking.customer_phone || booking.customer_email || 'Sin contacto';
      return `
        <tr>
          <td data-label="Hora">
            <div class="time-cell">
              <strong>${escapeHtml(booking.start_time)}</strong>
              <span>${escapeHtml(booking.end_time)}</span>
            </div>
          </td>
          <td data-label="Cliente">
            <div class="client-cell">
              <span class="client-avatar">${escapeHtml(initials(booking.customer_name))}</span>
              <div>
                <strong>${escapeHtml(booking.customer_name)}</strong>
                <span>${escapeHtml(contact)}</span>
              </div>
            </div>
          </td>
          <td data-label="Servicio">
            <span class="service-pill">
              <span class="service-dot" style="background:${escapeHtml(booking.service.color)}"></span>
              ${escapeHtml(booking.service.name)}
            </span>
          </td>
          <td data-label="Profesional">
            <div class="resource-cell">
              <span class="avatar" style="background:${escapeHtml(booking.resource.color)}1f;color:${escapeHtml(booking.resource.color)}">${escapeHtml(initials(booking.resource.name))}</span>
              ${escapeHtml(booking.resource.name)}
            </div>
          </td>
          <td data-label="Estado">${statusBadge(booking.status)}</td>
          <td data-label="Total"><span class="price-cell">${escapeHtml(formatMoney(booking.service.price))}</span></td>
          <td data-label="Acciones">
            <div class="row-actions">${rowActions(booking)}</div>
          </td>
        </tr>`;
    })
    .join('');

  container.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Profesional</th>
            <th>Estado</th>
            <th>Total</th>
            <th style="text-align:right">Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function rowActions(booking) {
  const buttons = [
    `<button class="icon-btn" type="button" data-booking-details="${booking.id}" title="Ver detalle" aria-label="Ver detalle">
      ${icon('info')}
    </button>`,
  ];

  if (booking.status === 'pending') {
    buttons.push(
      `<button class="icon-btn icon-btn--success" type="button" data-booking-id="${booking.id}" data-booking-action="confirmed" title="Confirmar reserva" aria-label="Confirmar reserva">${icon('check')}</button>`
    );
  }
  if (booking.status === 'confirmed') {
    buttons.push(
      `<button class="icon-btn icon-btn--primary" type="button" data-booking-id="${booking.id}" data-booking-action="completed" title="Marcar como completada" aria-label="Marcar como completada">${icon('check-circle')}</button>`
    );
  }
  if (booking.status === 'pending' || booking.status === 'confirmed') {
    buttons.push(
      `<button class="icon-btn icon-btn--danger" type="button" data-booking-id="${booking.id}" data-booking-action="cancelled" title="Cancelar reserva" aria-label="Cancelar reserva">${icon('ban')}</button>`
    );
  }

  return buttons.join('');
}

async function handleBookingActions(event) {
  const detailsButton = event.target.closest('[data-booking-details]');
  if (detailsButton) {
    openBookingDetails(Number(detailsButton.dataset.bookingDetails));
    return;
  }

  const actionButton = event.target.closest('[data-booking-action]');
  if (!actionButton) return;

  const id = Number(actionButton.dataset.bookingId);
  const status = actionButton.dataset.bookingAction;
  if (status === 'cancelled' && !window.confirm('¿Seguro que quieres cancelar esta reserva?')) {
    return;
  }

  actionButton.disabled = true;
  try {
    await apiAdmin(`/api/admin/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const labels = {
      confirmed: 'Reserva confirmada',
      completed: 'Reserva marcada como completada',
      cancelled: 'Reserva cancelada',
    };
    toast(labels[status] || 'Reserva actualizada', 'success');
    closeModal();
    await Promise.all([loadBookings(), loadStats()]);
  } catch (error) {
    toast(error.message, 'error');
    actionButton.disabled = false;
  }
}

function openBookingDetails(id) {
  const booking = admin.bookings.find((item) => item.id === id);
  if (!booking) return;

  const actions = [];
  if (booking.status === 'pending') {
    actions.push(
      `<button class="btn btn-success btn-sm" type="button" data-booking-id="${booking.id}" data-booking-action="confirmed">${icon('check')} Confirmar</button>`
    );
  }
  if (booking.status === 'confirmed') {
    actions.push(
      `<button class="btn btn-soft btn-sm" type="button" data-booking-id="${booking.id}" data-booking-action="completed">${icon('check-circle')} Completar</button>`
    );
  }
  if (booking.status === 'pending' || booking.status === 'confirmed') {
    actions.push(
      `<button class="btn btn-danger btn-sm" type="button" data-booking-id="${booking.id}" data-booking-action="cancelled">${icon('ban')} Cancelar</button>`
    );
  }

  const body = `
    <div class="booking-detail-head">
      <strong>${escapeHtml(booking.code)}</strong>
      ${statusBadge(booking.status)}
    </div>
    <div class="booking-detail-body">
      <div class="booking-detail-row"><span>Cliente</span><strong>${escapeHtml(booking.customer_name)}</strong></div>
      <div class="booking-detail-row"><span>Teléfono</span><span>${escapeHtml(booking.customer_phone || '—')}</span></div>
      <div class="booking-detail-row"><span>Correo</span><span>${escapeHtml(booking.customer_email || '—')}</span></div>
      <div class="booking-detail-row"><span>Servicio</span><span>${escapeHtml(booking.service.name)} · ${escapeHtml(formatMoney(booking.service.price))}</span></div>
      <div class="booking-detail-row"><span>Profesional</span><span>${escapeHtml(booking.resource.name)}</span></div>
      <div class="booking-detail-row"><span>Fecha</span><span>${escapeHtml(formatDateLong(booking.date))}</span></div>
      <div class="booking-detail-row"><span>Hora</span><span>${escapeHtml(booking.start_time)} – ${escapeHtml(booking.end_time)}</span></div>
      ${
        booking.notes
          ? `<div class="booking-detail-notes"><strong>Notas:</strong> ${escapeHtml(booking.notes)}</div>`
          : ''
      }
    </div>
    <div class="modal-form-actions">
      <button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cerrar</button>
      ${actions.join('')}
    </div>`;

  const modal = openModal({
    title: 'Detalle de la reserva',
    subtitle: 'Información completa de la cita.',
    iconName: 'calendar',
    body,
  });
  bindModalClose(modal);
}

/* -------------------------------------------------------------------------- */
/*  Exportación CSV                                                           */
/* -------------------------------------------------------------------------- */

async function exportCsv() {
  const button = $('#export-btn');
  button.disabled = true;
  const params = new URLSearchParams();
  if (admin.filters.date) params.set('date', admin.filters.date);
  if (admin.filters.status) params.set('status', admin.filters.status);
  if (admin.filters.query) params.set('query', admin.filters.query);

  try {
    const response = await fetch(`/api/admin/bookings/export?${params.toString()}`, {
      credentials: 'same-origin',
    });
    if (response.status === 401) {
      showLogin('Tu sesión expiró. Inicia sesión de nuevo.');
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo exportar');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas-${todayString()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Archivo CSV descargado', 'success');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Servicios                                                                 */
/* -------------------------------------------------------------------------- */

function renderServices() {
  const container = $('#services-grid');
  if (admin.services.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="min-height:220px;grid-column:1/-1">
        ${icon('briefcase')}
        <h3>Sin servicios todavía</h3>
        <p>Crea tu primer servicio para que los clientes puedan reservarlo.</p>
        <button class="btn btn-primary btn-sm" type="button" id="empty-new-service">${icon('plus')} Nuevo servicio</button>
      </div>`;
    $('#empty-new-service').addEventListener('click', () => openServiceModal());
    return;
  }

  container.innerHTML = admin.services
    .map(
      (service) => `
        <article class="entity-card ${service.active ? '' : 'is-inactive'}">
          <div class="entity-head">
            <span class="entity-swatch" style="background:${escapeHtml(service.color)}">${icon('sparkles')}</span>
            <div class="entity-title">
              <h3>${escapeHtml(service.name)}</h3>
              <p>${escapeHtml(service.description || 'Sin descripción')}</p>
            </div>
            <div class="entity-actions">
              <button class="icon-btn" type="button" data-edit-service="${service.id}" title="Editar servicio" aria-label="Editar servicio">${icon('edit')}</button>
              <button class="icon-btn ${service.active ? 'icon-btn--danger' : 'icon-btn--success'}" type="button"
                data-toggle-service="${service.id}" title="${service.active ? 'Desactivar' : 'Activar'}" aria-label="${service.active ? 'Desactivar' : 'Activar'}">
                ${icon(service.active ? 'trash' : 'check-circle')}
              </button>
            </div>
          </div>
          <div class="entity-meta">
            ${service.active ? '<span class="badge badge-confirmed">Activo</span>' : '<span class="badge badge-cancelled">Inactivo</span>'}
            <span>${icon('clock')} ${service.duration_min} min</span>
            <span>${icon('coins')} ${escapeHtml(formatMoney(service.price))}</span>
          </div>
        </article>`
    )
    .join('');
}

function handleServiceGridClick(event) {
  const editButton = event.target.closest('[data-edit-service]');
  if (editButton) {
    const service = admin.services.find((item) => item.id === Number(editButton.dataset.editService));
    if (service) openServiceModal(service);
    return;
  }

  const toggleButton = event.target.closest('[data-toggle-service]');
  if (toggleButton) {
    const service = admin.services.find((item) => item.id === Number(toggleButton.dataset.toggleService));
    if (service) toggleService(service);
  }
}

function openServiceModal(service = null) {
  const editing = Boolean(service);
  const body = `
    <form class="modal-form" id="service-form">
      <div class="form-grid">
        <label class="field full">
          <span>Nombre del servicio *</span>
          <input type="text" name="name" required minlength="2" maxlength="80" placeholder="Ej. Consulta inicial"
            value="${escapeHtml(service?.name || '')}">
        </label>
        <label class="field full">
          <span>Descripción</span>
          <textarea name="description" maxlength="300" rows="2"
            placeholder="Qué incluye y a quién está dirigido…">${escapeHtml(service?.description || '')}</textarea>
        </label>
        <label class="field">
          <span>Duración (minutos) *</span>
          <input type="number" name="duration_min" min="5" max="480" step="5" required
            value="${service?.duration_min ?? 30}">
        </label>
        <label class="field">
          <span>Precio *</span>
          <input type="number" name="price" min="0" max="1000000" step="0.01" required
            value="${service?.price ?? 0}">
        </label>
        <div class="field full">
          <span>Color identificativo</span>
          <div class="color-field">
            <input type="color" name="color" value="${escapeHtml(service?.color || '#4f46e5')}">
            <span>Se usa en la web y en la agenda.</span>
          </div>
        </div>
        <label class="checkbox-field full">
          <input type="checkbox" name="active" ${service ? (service.active ? 'checked' : '') : 'checked'}>
          <span>Servicio visible para reservar</span>
        </label>
      </div>
      <div class="form-error" hidden></div>
      <div class="modal-form-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cancelar</button>
        <button class="btn btn-primary btn-sm" type="submit">${editing ? 'Guardar cambios' : 'Crear servicio'}</button>
      </div>
    </form>`;

  const modal = openModal({
    title: editing ? 'Editar servicio' : 'Nuevo servicio',
    subtitle: editing ? 'Actualiza la información del servicio.' : 'Añade una nueva opción al catálogo.',
    iconName: 'briefcase',
    body,
  });
  bindModalClose(modal);

  const form = $('#service-form', modal);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formError = $('.form-error', form);
    const submit = $('button[type="submit"]', form);
    const data = new FormData(form);
    const payload = {
      name: data.get('name'),
      description: data.get('description'),
      duration_min: Number(data.get('duration_min')),
      price: Number(data.get('price')),
      color: data.get('color'),
      active: data.get('active') === 'on' ? 1 : 0,
    };

    submit.disabled = true;
    formError.hidden = true;
    try {
      await apiAdmin(editing ? `/api/admin/services/${service.id}` : '/api/admin/services', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      toast(editing ? 'Servicio actualizado' : 'Servicio creado', 'success');
      closeModal();
      admin.services = await apiAdmin('/api/admin/services');
      renderServices();
      loadBookings();
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      submit.disabled = false;
    }
  });
}

async function toggleService(service) {
  if (service.active && !window.confirm(`¿Desactivar el servicio «${service.name}»? Dejará de mostrarse al reservar.`)) {
    return;
  }
  try {
    if (service.active) {
      await apiAdmin(`/api/admin/services/${service.id}`, { method: 'DELETE' });
    } else {
      await apiAdmin(`/api/admin/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...service, active: 1 }),
      });
    }
    toast(service.active ? 'Servicio desactivado' : 'Servicio activado', 'success');
    admin.services = await apiAdmin('/api/admin/services');
    renderServices();
    loadBookings();
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* -------------------------------------------------------------------------- */
/*  Equipo y recursos                                                         */
/* -------------------------------------------------------------------------- */

function renderResources() {
  const container = $('#resources-grid');
  if (admin.resources.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="min-height:220px;grid-column:1/-1">
        ${icon('users')}
        <h3>Sin recursos todavía</h3>
        <p>Añade profesionales, salas o cualquier recurso reservable.</p>
        <button class="btn btn-primary btn-sm" type="button" id="empty-new-resource">${icon('plus')} Añadir recurso</button>
      </div>`;
    $('#empty-new-resource').addEventListener('click', () => openResourceModal());
    return;
  }

  container.innerHTML = admin.resources
    .map(
      (resource) => `
        <article class="entity-card ${resource.active ? '' : 'is-inactive'}">
          <div class="entity-head">
            <span class="avatar avatar--lg" style="background:${escapeHtml(resource.color)}1f;color:${escapeHtml(resource.color)}">${escapeHtml(initials(resource.name))}</span>
            <div class="entity-title">
              <h3>${escapeHtml(resource.name)}</h3>
              <p>${escapeHtml(resource.role || 'Recurso reservable')}</p>
            </div>
            <div class="entity-actions">
              <button class="icon-btn" type="button" data-edit-resource="${resource.id}" title="Editar recurso" aria-label="Editar recurso">${icon('edit')}</button>
              <button class="icon-btn ${resource.active ? 'icon-btn--danger' : 'icon-btn--success'}" type="button"
                data-toggle-resource="${resource.id}" title="${resource.active ? 'Desactivar' : 'Activar'}" aria-label="${resource.active ? 'Desactivar' : 'Activar'}">
                ${icon(resource.active ? 'trash' : 'check-circle')}
              </button>
            </div>
          </div>
          ${
            resource.email || resource.phone
              ? `<div class="entity-contact">
                   ${resource.email ? `<span>${icon('mail')} ${escapeHtml(resource.email)}</span>` : ''}
                   ${resource.phone ? `<span>${icon('phone')} ${escapeHtml(resource.phone)}</span>` : ''}
                 </div>`
              : ''
          }
          <div class="entity-meta">
            ${resource.active ? '<span class="badge badge-confirmed">Activo</span>' : '<span class="badge badge-cancelled">Inactivo</span>'}
            <span>${icon('calendar')} ${resource.schedules.length > 0 ? `${new Set(resource.schedules.map((item) => item.weekday)).size} días` : 'Sin horario'}</span>
          </div>
          <div class="entity-schedule">${renderScheduleSummary(resource)}</div>
          ${
            resource.schedules.length === 0
              ? `<div class="entity-hint">${icon('alert')} Configura un horario para que pueda recibir reservas.</div>`
              : ''
          }
        </article>`
    )
    .join('');
}

function renderScheduleSummary(resource) {
  const schedules = resource.schedules || [];
  if (schedules.length === 0) return '<span>Sin disponibilidad configurada.</span>';

  const byDay = new Map();
  for (const schedule of schedules) {
    if (!byDay.has(schedule.weekday)) byDay.set(schedule.weekday, []);
    byDay.get(schedule.weekday).push(schedule);
  }

  const signature = (weekday) => {
    const intervals = byDay.get(weekday) || [];
    return intervals
      .slice()
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((item) => `${item.start_time}-${item.end_time}`)
      .join('|');
  };

  const groups = [];
  for (const weekday of DAY_ORDER) {
    if (!byDay.has(weekday)) continue;
    const sig = signature(weekday);
    const last = groups[groups.length - 1];
    if (last && last.signature === sig && DAY_ORDER.indexOf(weekday) === DAY_ORDER.indexOf(last.lastDay) + 1) {
      last.lastDay = weekday;
    } else {
      groups.push({ signature: sig, firstDay: weekday, lastDay: weekday });
    }
  }

  const formatted = groups.map((group) => {
    const label =
      group.firstDay === group.lastDay
        ? DAY_NAMES_SHORT[group.firstDay]
        : `${DAY_NAMES_SHORT[group.firstDay]}–${DAY_NAMES_SHORT[group.lastDay]}`;
    const times = group.signature
      .split('|')
      .filter(Boolean)
      .map((range) => range.replace('-', '–'))
      .join(', ');
    return `<span><strong>${escapeHtml(label)}</strong> ${escapeHtml(times)}</span>`;
  });

  return formatted.join(' · ');
}

function handleResourceGridClick(event) {
  const editButton = event.target.closest('[data-edit-resource]');
  if (editButton) {
    const resource = admin.resources.find((item) => item.id === Number(editButton.dataset.editResource));
    if (resource) openResourceModal(resource);
    return;
  }

  const toggleButton = event.target.closest('[data-toggle-resource]');
  if (toggleButton) {
    const resource = admin.resources.find((item) => item.id === Number(toggleButton.dataset.toggleResource));
    if (resource) toggleResource(resource);
  }
}

function scheduleEditorValues(schedules, weekday) {
  const intervals = schedules
    .filter((item) => item.weekday === weekday)
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (intervals.length === 0) {
    return { enabled: false, start: '09:00', end: '13:00', breakStart: '', breakEnd: '' };
  }
  if (intervals.length === 1) {
    return {
      enabled: true,
      start: intervals[0].start_time,
      end: intervals[0].end_time,
      breakStart: '',
      breakEnd: '',
    };
  }
  return {
    enabled: true,
    start: intervals[0].start_time,
    end: intervals[intervals.length - 1].end_time,
    breakStart: intervals[0].end_time,
    breakEnd: intervals[1].start_time,
  };
}

function defaultSchedules() {
  const schedules = [];
  for (let weekday = 1; weekday <= 5; weekday += 1) {
    schedules.push({ weekday, start_time: '09:00', end_time: '13:00' });
    schedules.push({ weekday, start_time: '14:00', end_time: '18:00' });
  }
  schedules.push({ weekday: 6, start_time: '09:00', end_time: '13:00' });
  return schedules;
}

function scheduleEditorMarkup(schedules) {
  return DAY_ORDER.map((weekday) => {
    const values = scheduleEditorValues(schedules, weekday);
    return `
      <div class="schedule-row ${values.enabled ? '' : 'is-disabled'}" data-schedule-row="${weekday}">
        <label class="schedule-day">
          <input type="checkbox" data-day-enabled ${values.enabled ? 'checked' : ''}>
          ${DAY_NAMES[weekday]}
        </label>
        <label class="schedule-time">
          <span>Inicio</span>
          <input type="time" data-day-start value="${values.start}">
        </label>
        <label class="schedule-time">
          <span>Fin</span>
          <input type="time" data-day-end value="${values.end}">
        </label>
        <label class="schedule-time">
          <span>Descanso</span>
          <input type="time" data-day-break-start value="${values.breakStart}">
        </label>
        <label class="schedule-time">
          <span>Fin descanso</span>
          <input type="time" data-day-break-end value="${values.breakEnd}">
        </label>
      </div>`;
  }).join('');
}

function openResourceModal(resource = null) {
  const editing = Boolean(resource);
  const schedules = resource ? resource.schedules : defaultSchedules();
  const body = `
    <form class="modal-form" id="resource-form">
      <div class="form-grid">
        <label class="field">
          <span>Nombre *</span>
          <input type="text" name="name" required minlength="2" maxlength="80" placeholder="Ej. Ana García"
            value="${escapeHtml(resource?.name || '')}">
        </label>
        <label class="field">
          <span>Rol o descripción</span>
          <input type="text" name="role" maxlength="80" placeholder="Ej. Especialista"
            value="${escapeHtml(resource?.role || '')}">
        </label>
        <label class="field">
          <span>Correo</span>
          <input type="email" name="email" maxlength="160" placeholder="ana@ejemplo.com"
            value="${escapeHtml(resource?.email || '')}">
        </label>
        <label class="field">
          <span>Teléfono</span>
          <input type="tel" name="phone" maxlength="40" placeholder="+1 555 0100"
            value="${escapeHtml(resource?.phone || '')}">
        </label>
        <div class="field">
          <span>Color identificativo</span>
          <div class="color-field">
            <input type="color" name="color" value="${escapeHtml(resource?.color || '#0ea5e9')}">
            <span>Se usa en la agenda.</span>
          </div>
        </div>
        <label class="checkbox-field" style="align-self:end;padding-bottom:11px">
          <input type="checkbox" name="active" ${resource ? (resource.active ? 'checked' : '') : 'checked'}>
          <span>Disponible para reservar</span>
        </label>
      </div>

      <div>
        <span class="field-label" style="display:block;margin-bottom:7px">Horario semanal</span>
        <div class="schedule-editor" id="schedule-editor">
          ${scheduleEditorMarkup(schedules)}
        </div>
        <p class="schedule-note">
          ${icon('info')}
          <span>El descanso es opcional. Ej. 09:00–13:00 y 14:00–18:00 se configura como 09:00 a 18:00 con descanso de 13:00 a 14:00.</span>
        </p>
      </div>

      <div class="form-error" hidden></div>
      <div class="modal-form-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-modal-close>Cancelar</button>
        <button class="btn btn-primary btn-sm" type="submit">${editing ? 'Guardar cambios' : 'Crear recurso'}</button>
      </div>
    </form>`;

  const modal = openModal({
    title: editing ? 'Editar recurso' : 'Nuevo recurso',
    subtitle: 'Configura sus datos y disponibilidad semanal.',
    iconName: 'users',
    body,
    wide: true,
  });
  bindModalClose(modal);

  const form = $('#resource-form', modal);
  const editor = $('#schedule-editor', modal);

  editor.addEventListener('change', (event) => {
    if (!event.target.matches('[data-day-enabled]')) return;
    const row = event.target.closest('.schedule-row');
    row.classList.toggle('is-disabled', !event.target.checked);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formError = $('.form-error', form);
    const submit = $('button[type="submit"]', form);
    const data = new FormData(form);
    formError.hidden = true;

    const schedulesPayload = [];
    let scheduleError = '';

    for (const row of $$('.schedule-row', editor)) {
      if (!$('[data-day-enabled]', row).checked) continue;
      const weekday = Number(row.dataset.scheduleRow);
      const start = $('[data-day-start]', row).value;
      const end = $('[data-day-end]', row).value;
      const breakStart = $('[data-day-break-start]', row).value;
      const breakEnd = $('[data-day-break-end]', row).value;

      if (!start || !end || start >= end) {
        scheduleError = `El horario del ${DAY_NAMES[weekday].toLowerCase()} no es válido.`;
        break;
      }
      if (breakStart || breakEnd) {
        if (!breakStart || !breakEnd || !(start < breakStart && breakStart < breakEnd && breakEnd < end)) {
          scheduleError = `El descanso del ${DAY_NAMES[weekday].toLowerCase()} debe estar dentro del horario.`;
          break;
        }
        schedulesPayload.push({ weekday, start_time: start, end_time: breakStart });
        schedulesPayload.push({ weekday, start_time: breakEnd, end_time: end });
      } else {
        schedulesPayload.push({ weekday, start_time: start, end_time: end });
      }
    }

    if (scheduleError) {
      formError.textContent = scheduleError;
      formError.hidden = false;
      return;
    }

    const payload = {
      name: data.get('name'),
      role: data.get('role'),
      email: data.get('email'),
      phone: data.get('phone'),
      color: data.get('color'),
      active: data.get('active') === 'on' ? 1 : 0,
      schedules: schedulesPayload,
    };

    submit.disabled = true;
    try {
      await apiAdmin(editing ? `/api/admin/resources/${resource.id}` : '/api/admin/resources', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      toast(editing ? 'Recurso actualizado' : 'Recurso creado', 'success');
      closeModal();
      admin.resources = await apiAdmin('/api/admin/resources');
      renderResources();
      loadBookings();
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      submit.disabled = false;
    }
  });
}

async function toggleResource(resource) {
  if (resource.active && !window.confirm(`¿Desactivar «${resource.name}»? Dejará de aparecer en la reserva online.`)) {
    return;
  }
  try {
    if (resource.active) {
      await apiAdmin(`/api/admin/resources/${resource.id}`, { method: 'DELETE' });
    } else {
      await apiAdmin(`/api/admin/resources/${resource.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...resource, active: 1 }),
      });
    }
    toast(resource.active ? 'Recurso desactivado' : 'Recurso activado', 'success');
    admin.resources = await apiAdmin('/api/admin/resources');
    renderResources();
    loadBookings();
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* -------------------------------------------------------------------------- */
/*  Ajustes                                                                   */
/* -------------------------------------------------------------------------- */

function fillSettingsForm() {
  const form = $('#settings-form');
  if (!form) return;
  const settings = admin.settings;
  for (const [key, value] of Object.entries(settings)) {
    const field = form.elements.namedItem(key);
    if (!field) continue;
    if (field.type === 'checkbox') field.checked = value === '1';
    else field.value = value;
  }
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const button = $('#save-settings-btn');
  const data = new FormData(form);
  const payload = {
    business_name: data.get('business_name'),
    business_tagline: data.get('business_tagline'),
    currency_symbol: data.get('currency_symbol'),
    contact_email: data.get('contact_email'),
    contact_phone: data.get('contact_phone'),
    address: data.get('address'),
    slot_interval: Number(data.get('slot_interval')),
    max_advance_days: Number(data.get('max_advance_days')),
    lead_time_minutes: Number(data.get('lead_time_minutes')),
    auto_confirm: data.get('auto_confirm') === 'on' ? '1' : '0',
  };

  button.disabled = true;
  try {
    admin.settings = await apiAdmin('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    applySettingsToPage();
    fillSettingsForm();
    toast('Ajustes guardados', 'success');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

/* -------------------------------------------------------------------------- */
/*  Modales                                                                   */
/* -------------------------------------------------------------------------- */

function openModal({ title, subtitle = '', body, iconName = 'edit', wide = false }) {
  const modal = document.createElement('div');
  modal.className = 'modal admin-modal';
  modal.id = 'admin-modal';
  modal.innerHTML = `
    <div class="modal-backdrop" data-modal-close></div>
    <div class="modal-card ${wide ? 'modal-card--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
      <button class="modal-close" type="button" aria-label="Cerrar" data-modal-close>
        ${icon('x')}
      </button>
      <div class="modal-heading">
        <span class="modal-icon">${icon(iconName)}</span>
        <div>
          <h2 id="admin-modal-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
        </div>
      </div>
      ${body}
    </div>`;
  modalRoot.replaceChildren(modal);
  document.body.classList.add('modal-open');
  bindModalClose(modal);

  setTimeout(() => {
    const focusTarget = $('.modal-card input, .modal-card select, .modal-card textarea', modal);
    if (focusTarget) focusTarget.focus();
  }, 60);

  return modal;
}

function bindModalClose(modal) {
  $$('[data-modal-close]', modal).forEach((element) => {
    element.addEventListener('click', closeModal);
  });
}

function closeModal() {
  if (!modalRoot) return;
  modalRoot.replaceChildren();
  document.body.classList.remove('modal-open');
}

/* -------------------------------------------------------------------------- */
/*  Avisos                                                                    */
/* -------------------------------------------------------------------------- */

function toast(message, type = 'info') {
  const region = $('#toast-region');
  if (!region) return;
  const element = document.createElement('div');
  element.className = `toast ${type === 'error' ? 'is-error' : type === 'success' ? 'is-success' : ''}`;
  const iconName = type === 'error' ? 'alert' : type === 'success' ? 'check-circle' : 'info';
  element.innerHTML = `${icon(iconName)}<span>${escapeHtml(message)}</span>`;
  region.appendChild(element);
  setTimeout(() => {
    element.classList.add('is-leaving');
    setTimeout(() => element.remove(), 220);
  }, 4200);
}
