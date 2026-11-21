'use strict';

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                */
/* -------------------------------------------------------------------------- */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ICONS = '/assets/icons.svg';
const icon = (name, className = 'icon') =>
  `<svg class="${className}" aria-hidden="true"><use href="${ICONS}#i-${name}"></use></svg>`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[character];
  });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentMonth() {
  return localDateString().slice(0, 7);
}

function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

function monthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
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
  const symbol = state.settings.currency_symbol || '$';
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

function addMinutesToTime(time, minutes) {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers });
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

/* -------------------------------------------------------------------------- */
/*  Estado                                                                    */
/* -------------------------------------------------------------------------- */

const state = {
  settings: {
    business_name: 'ReservaFácil',
    business_tagline: 'Reserva tu próxima cita en segundos, sin llamadas ni esperas.',
    currency_symbol: '$',
    max_advance_days: '60',
  },
  services: [],
  resources: [],
  loaded: false,
  initError: null,
  step: 1,
  serviceId: null,
  resourceId: 'any',
  date: null,
  time: null,
  month: null,
  monthData: null,
  monthLoading: false,
  monthError: null,
  autoAdvanced: false,
  slots: [],
  slotsLoading: false,
  slotsError: null,
  confirmation: null,
  submitting: false,
  formData: {},
  lookupBooking: null,
  lastFocus: null,
};

let contentElement;
let stepperElement;
let lookupModal;

/* -------------------------------------------------------------------------- */
/*  Inicialización                                                            */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  contentElement = $('#booking-content');
  stepperElement = $('#stepper');
  lookupModal = $('#lookup-modal');

  bindEvents();
  $('#current-year').textContent = new Date().getFullYear();
  await loadData();

  const codeFromUrl = new URLSearchParams(window.location.search).get('code');
  if (codeFromUrl) {
    openLookup(codeFromUrl);
    searchBooking(codeFromUrl);
  }
}

async function loadData() {
  state.initError = null;
  render();
  try {
    const [settings, services, resources] = await Promise.all([
      api('/api/settings'),
      api('/api/services'),
      api('/api/resources'),
    ]);
    state.settings = { ...state.settings, ...settings };
    state.services = services;
    state.resources = resources;
    state.loaded = true;
    applyBranding();
    render();
  } catch (error) {
    state.initError = error.message;
    state.loaded = false;
    render();
  }
}

function applyBranding() {
  const settings = state.settings;
  const name = settings.business_name || 'ReservaFácil';
  document.title = `${name} · Reserva tu cita online`;
  $$('[data-brand-name]').forEach((element) => {
    element.textContent = name;
  });
  const brandName = $('#brand-name');
  if (brandName) brandName.textContent = name;

  const tagline = $('#hero-tagline');
  if (tagline && settings.business_tagline) tagline.textContent = settings.business_tagline;

  const address = $('[data-address]');
  if (address) address.textContent = settings.address || '';
  const phone = $('[data-phone]');
  if (phone) phone.textContent = settings.contact_phone || '';
  const email = $('[data-email]');
  if (email) email.textContent = settings.contact_email || '';
}

/* -------------------------------------------------------------------------- */
/*  Eventos                                                                   */
/* -------------------------------------------------------------------------- */

function bindEvents() {
  if (stepperElement) {
    stepperElement.addEventListener('click', (event) => {
      const button = event.target.closest('[data-step]');
      if (!button || button.disabled) return;
      goToStep(Number(button.dataset.step));
    });
  }

  if (contentElement) {
    contentElement.addEventListener('click', handleContentClick);
    contentElement.addEventListener('submit', handleSubmit);
    contentElement.addEventListener('input', handleFormInput);
    contentElement.addEventListener('change', handleFormInput);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-lookup]');
    if (!trigger) return;
    event.preventDefault();
    openLookup();
  });

  $$('[data-close-lookup]').forEach((element) => {
    element.addEventListener('click', closeLookup);
  });

  $('#lookup-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    searchBooking($('#lookup-code').value);
  });

  $('#lookup-result')?.addEventListener('click', handleLookupAction);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lookupModal && !lookupModal.hidden) closeLookup();
  });
}

function handleContentClick(event) {
  const serviceButton = event.target.closest('[data-service-id]');
  if (serviceButton) {
    selectService(Number(serviceButton.dataset.serviceId));
    return;
  }

  const resourceButton = event.target.closest('[data-resource-id]');
  if (resourceButton) {
    selectResource(resourceButton.dataset.resourceId);
    return;
  }

  const dateButton = event.target.closest('[data-date]');
  if (dateButton && !dateButton.disabled) {
    selectDate(dateButton.dataset.date);
    return;
  }

  const monthButton = event.target.closest('[data-month-nav]');
  if (monthButton && !monthButton.disabled) {
    changeMonth(Number(monthButton.dataset.monthNav));
    return;
  }

  const slotButton = event.target.closest('[data-time]');
  if (slotButton) {
    selectTime(slotButton.dataset.time);
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;

  switch (actionButton.dataset.action) {
    case 'next':
      goToStep(state.step + 1);
      break;
    case 'back':
      goToStep(state.step - 1);
      break;
    case 'retry-init':
      loadData();
      break;
    case 'retry-month':
      loadMonth();
      break;
    case 'retry-slots':
      loadSlots();
      break;
    case 'reset-booking':
      resetBooking();
      break;
    case 'download-ics':
      if (state.confirmation) downloadIcs(state.confirmation);
      break;
    case 'lookup-confirmation':
      if (state.confirmation) {
        openLookup(state.confirmation.code);
        searchBooking(state.confirmation.code);
      }
      break;
    default:
      break;
  }
}

function handleFormInput(event) {
  const field = event.target.closest('#booking-form [name]');
  if (!field) return;
  state.formData[field.name] = field.type === 'checkbox' ? field.checked : field.value;
}

async function handleSubmit(event) {
  if (!event.target.matches('#booking-form')) return;
  event.preventDefault();
  if (state.submitting) return;

  const form = event.target;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const button = $('button[type="submit"]', form);
  state.submitting = true;
  if (button) {
    button.disabled = true;
    button.dataset.originalHtml = button.innerHTML;
    button.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Reservando…`;
  }

  try {
    const data = await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        service_id: state.serviceId,
        resource_id: state.resourceId === 'any' ? null : Number(state.resourceId),
        date: state.date,
        start_time: state.time,
        customer_name: state.formData.customer_name || '',
        customer_email: state.formData.customer_email || '',
        customer_phone: state.formData.customer_phone || '',
        notes: state.formData.notes || '',
      }),
    });
    state.confirmation = data.booking;
    state.step = 5;
    state.submitting = false;
    state.formData = {};
    render();
    toast('Reserva registrada correctamente', 'success');
    const main = $('.booking-main');
    if (main) {
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    state.submitting = false;
    if (button) {
      button.disabled = false;
      button.innerHTML = button.dataset.originalHtml || 'Confirmar reserva';
    }
    toast(error.message, 'error');
    if (error.status === 409) {
      state.time = null;
      state.step = 3;
      state.slots = [];
      render();
      loadSlots();
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Selecciones                                                               */
/* -------------------------------------------------------------------------- */

function selectService(serviceId) {
  if (state.serviceId === serviceId) return;
  state.serviceId = serviceId;
  state.resourceId = 'any';
  resetSchedule();
  render();
}

function selectResource(resourceId) {
  const normalized = resourceId === 'any' ? 'any' : Number(resourceId);
  state.resourceId = normalized;
  resetSchedule();
  render();
}

function resetSchedule() {
  state.date = null;
  state.time = null;
  state.slots = [];
  state.slotsError = null;
  state.month = null;
  state.monthData = null;
  state.monthError = null;
  state.autoAdvanced = false;
}

function selectDate(date) {
  if (state.monthData && !state.monthData.days[date]) return;
  state.date = date;
  state.time = null;
  state.slots = [];
  state.slotsError = null;
  render();
  loadSlots();
}

function selectTime(time) {
  state.time = time;
  render();
}

function changeMonth(delta) {
  if (!state.month) return;
  const next = shiftMonth(state.month, delta);
  const minMonth = currentMonth();
  const maxMonth = getMaxDate().slice(0, 7);
  if (next < minMonth || next > maxMonth) return;
  state.month = next;
  state.monthData = null;
  state.monthError = null;
  state.date = null;
  state.time = null;
  state.slots = [];
  render();
  loadMonth();
}

function goToStep(step) {
  if (state.step === 5) return;
  if (step < 1 || step > 4) return;
  if (step >= 2 && !state.serviceId) return;
  if (step === 4 && (!state.date || !state.time)) return;
  state.step = step;
  render();
  if (step === 3) ensureMonth();
}

function resetBooking() {
  state.step = 1;
  state.serviceId = null;
  state.resourceId = 'any';
  state.confirmation = null;
  state.submitting = false;
  state.formData = {};
  resetSchedule();
  render();
  const section = $('#reservar');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* -------------------------------------------------------------------------- */
/*  Datos derivados                                                           */
/* -------------------------------------------------------------------------- */

function selectedService() {
  return state.services.find((service) => service.id === state.serviceId) || null;
}

function selectedResource() {
  if (state.resourceId === 'any') return null;
  return state.resources.find((resource) => resource.id === Number(state.resourceId)) || null;
}

function selectedSlot() {
  return state.slots.find((slot) => slot.time === state.time) || null;
}

function getMaxDate() {
  const days = Number.parseInt(state.settings.max_advance_days, 10) || 60;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function scheduleSummary(resource) {
  const schedules = resource.schedules || [];
  if (schedules.length === 0) return 'Sin horario configurado';
  const days = [...new Set(schedules.map((item) => item.weekday))].sort((a, b) => a - b);
  const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  let label;
  if (days.length === 7) label = 'Todos los días';
  else if ([1, 2, 3, 4, 5, 6].every((day) => days.includes(day))) label = 'Lun – Sáb';
  else if ([1, 2, 3, 4, 5].every((day) => days.includes(day))) label = 'Lun – Vie';
  else label = days.map((day) => names[day]).join(', ');

  const starts = schedules.map((item) => item.start_time).sort();
  const ends = schedules.map((item) => item.end_time).sort();
  return `${label} · ${starts[0]}–${ends[ends.length - 1]}`;
}

/* -------------------------------------------------------------------------- */
/*  Render principal                                                          */
/* -------------------------------------------------------------------------- */

function render() {
  renderStepper();
  renderSummary();
  renderContent();
}

function renderStepper() {
  if (!stepperElement) return;
  $$('.step', stepperElement).forEach((item) => {
    const step = Number(item.dataset.stepItem);
    item.classList.toggle('is-active', state.step === step);
    item.classList.toggle('is-done', state.step > step || state.step === 5);
    const button = $('.step-btn', item);
    if (!button) return;
    let disabled = state.step === 5;
    if (step >= 2) disabled = disabled || !state.serviceId;
    if (step === 4) disabled = disabled || !state.date || !state.time;
    button.disabled = disabled;
    if (state.step === step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}

function renderContent() {
  if (!contentElement) return;

  if (!state.loaded && state.initError) {
    contentElement.innerHTML = `
      <div class="empty-state">
        ${icon('alert')}
        <h3>No pudimos cargar la agenda</h3>
        <p>${escapeHtml(state.initError)}</p>
        <button class="btn btn-primary" type="button" data-action="retry-init">Reintentar</button>
      </div>`;
    return;
  }

  if (!state.loaded) {
    contentElement.innerHTML = `
      <div class="loading-state">
        <span class="spinner"></span>
        <p>Preparando la agenda…</p>
      </div>`;
    return;
  }

  if (state.step === 5 && state.confirmation) {
    contentElement.innerHTML = renderConfirmation();
    return;
  }

  if (state.services.length === 0) {
    contentElement.innerHTML = `
      <div class="empty-state">
        ${icon('calendar')}
        <h3>Sin servicios disponibles</h3>
        <p>Todavía no hay servicios configurados. Vuelve a intentarlo más tarde.</p>
      </div>`;
    return;
  }

  if (state.resources.length === 0) {
    contentElement.innerHTML = `
      <div class="empty-state">
        ${icon('users')}
        <h3>Sin disponibilidad por ahora</h3>
        <p>No hay profesionales ni recursos activos. Contacta con el negocio para reservar.</p>
      </div>`;
    return;
  }

  switch (state.step) {
    case 1:
      contentElement.innerHTML = renderServicesStep();
      break;
    case 2:
      contentElement.innerHTML = renderResourcesStep();
      break;
    case 3:
      contentElement.innerHTML = renderScheduleStep();
      break;
    case 4:
      contentElement.innerHTML = renderDetailsStep();
      break;
    default:
      break;
  }
}

/* -------------------------------------------------------------------------- */
/*  Paso 1 · Servicios                                                        */
/* -------------------------------------------------------------------------- */

function renderServicesStep() {
  const cards = state.services
    .map((service) => {
      const selected = service.id === state.serviceId;
      return `
        <button class="choice-card ${selected ? 'is-selected' : ''}" type="button"
          data-service-id="${service.id}" aria-pressed="${selected}">
          <span class="choice-swatch" style="background:${escapeHtml(service.color)}">
            ${icon('sparkles')}
          </span>
          <span class="choice-body">
            <strong>${escapeHtml(service.name)}</strong>
            <p>${escapeHtml(service.description || 'Atención personalizada.')}</p>
            <span class="choice-meta">
              <span>${icon('clock')} ${service.duration_min} min</span>
              <span class="choice-price">${escapeHtml(formatMoney(service.price))}</span>
            </span>
          </span>
          <span class="choice-check">${icon('check')}</span>
        </button>`;
    })
    .join('');

  return `
    <div class="step-panel">
      <div class="step-panel-head">
        <div>
          <h3 class="step-title">¿Qué servicio necesitas?</h3>
          <p class="step-desc">Elige la opción que mejor se adapte a ti.</p>
        </div>
        <span class="step-count">Paso 1 de 4</span>
      </div>
      <div class="choice-grid">${cards}</div>
      ${wizardActions({ nextLabel: 'Ver profesionales', disabled: !state.serviceId })}
    </div>`;
}

/* -------------------------------------------------------------------------- */
/*  Paso 2 · Profesionales                                                    */
/* -------------------------------------------------------------------------- */

function renderResourcesStep() {
  const service = selectedService();
  const anySelected = state.resourceId === 'any';

  const anyCard = `
    <button class="choice-card choice-card--any ${anySelected ? 'is-selected' : ''}" type="button"
      data-resource-id="any" aria-pressed="${anySelected}">
      <span class="choice-swatch">${icon('users')}</span>
      <span class="choice-body">
        <strong>Cualquiera disponible</strong>
        <p>Te asignamos al primer profesional con hueco a la hora que elijas.</p>
        <span class="choice-meta"><span>${icon('check')} Más horarios disponibles</span></span>
      </span>
      <span class="choice-check">${icon('check')}</span>
    </button>`;

  const cards = state.resources
    .map((resource) => {
      const selected = Number(state.resourceId) === resource.id;
      return `
        <button class="choice-card ${selected ? 'is-selected' : ''}" type="button"
          data-resource-id="${resource.id}" aria-pressed="${selected}">
          <span class="avatar" style="background:${escapeHtml(resource.color)}1f;color:${escapeHtml(resource.color)}">
            ${escapeHtml(initials(resource.name))}
          </span>
          <span class="choice-body">
            <strong>${escapeHtml(resource.name)}</strong>
            <p>${escapeHtml(resource.role || 'Profesional del equipo')}</p>
            <span class="choice-meta"><span>${icon('clock')} ${escapeHtml(scheduleSummary(resource))}</span></span>
          </span>
          <span class="choice-check">${icon('check')}</span>
        </button>`;
    })
    .join('');

  return `
    <div class="step-panel">
      <div class="step-panel-head">
        <div>
          <h3 class="step-title">¿Con quién quieres tu cita?</h3>
          <p class="step-desc">
            ${service ? `Servicio: <strong>${escapeHtml(service.name)}</strong> · ${service.duration_min} min` : 'Selecciona un profesional.'}
          </p>
        </div>
        <span class="step-count">Paso 2 de 4</span>
      </div>
      <div class="choice-grid">${anyCard}${cards}</div>
      ${wizardActions({ nextLabel: 'Ver disponibilidad', disabled: false })}
    </div>`;
}

/* -------------------------------------------------------------------------- */
/*  Paso 3 · Fecha y hora                                                     */
/* -------------------------------------------------------------------------- */

function ensureMonth() {
  if (!state.month) state.month = currentMonth();
  if (state.monthData && !state.monthError) {
    renderContent();
    return;
  }
  loadMonth();
}

async function loadMonth() {
  if (!state.month) state.month = currentMonth();
  state.monthLoading = true;
  state.monthError = null;
  renderContent();

  try {
    const params = new URLSearchParams({
      serviceId: String(state.serviceId),
      resourceId: state.resourceId === 'any' ? 'any' : String(state.resourceId),
      month: state.month,
    });
    const data = await api(`/api/availability/month?${params.toString()}`);
    state.monthData = data;
    state.monthLoading = false;

    const hasDays = Object.values(data.days || {}).some((count) => count > 0);
    const maxMonth = getMaxDate().slice(0, 7);
    if (!hasDays && !state.autoAdvanced && state.month < maxMonth) {
      state.autoAdvanced = true;
      state.month = shiftMonth(state.month, 1);
      state.monthData = null;
      loadMonth();
      return;
    }

    if (!state.date) {
      const firstAvailable = Object.keys(data.days || {})
        .sort()
        .find((date) => data.days[date] > 0);
      if (firstAvailable) {
        state.date = firstAvailable;
        renderContent();
        loadSlots();
        return;
      }
    }

    renderContent();
  } catch (error) {
    state.monthLoading = false;
    state.monthError = error.message;
    renderContent();
  }
}

async function loadSlots() {
  if (!state.date || !state.serviceId) return;
  state.slotsLoading = true;
  state.slotsError = null;
  state.slots = [];
  renderContent();

  try {
    const params = new URLSearchParams({
      serviceId: String(state.serviceId),
      resourceId: state.resourceId === 'any' ? 'any' : String(state.resourceId),
      date: state.date,
    });
    const data = await api(`/api/availability?${params.toString()}`);
    state.slots = data.slots || [];
    state.slotsLoading = false;
    if (state.time && !state.slots.some((slot) => slot.time === state.time)) {
      state.time = null;
    }
    renderContent();
  } catch (error) {
    state.slotsLoading = false;
    state.slotsError = error.message;
    renderContent();
  }
}

function renderScheduleStep() {
  const service = selectedService();
  return `
    <div class="step-panel">
      <div class="step-panel-head">
        <div>
          <h3 class="step-title">Elige fecha y hora</h3>
          <p class="step-desc">Solo mostramos horarios disponibles para ${escapeHtml(service?.duration_min || 0)} minutos.</p>
        </div>
        <span class="step-count">Paso 3 de 4</span>
      </div>
      <div class="scheduler">
        ${renderCalendar()}
        ${renderSlots()}
      </div>
      ${wizardActions({ nextLabel: 'Continuar', disabled: !state.time })}
    </div>`;
}

function renderCalendar() {
  const month = state.month || currentMonth();
  const minMonth = currentMonth();
  const maxMonth = getMaxDate().slice(0, 7);
  const nav = `
    <div class="calendar-head">
      <span class="calendar-title">${escapeHtml(monthLabel(month))}</span>
      <div class="calendar-nav">
        <button type="button" data-month-nav="-1" aria-label="Mes anterior" ${month <= minMonth ? 'disabled' : ''}>
          ${icon('chevron-left')}
        </button>
        <button type="button" data-month-nav="1" aria-label="Mes siguiente" ${month >= maxMonth ? 'disabled' : ''}>
          ${icon('chevron-right')}
        </button>
      </div>
    </div>`;

  if (state.monthLoading || (!state.monthData && !state.monthError)) {
    return `
      <div class="calendar-card">
        ${nav}
        <div class="loading-state" style="min-height:250px">
          <span class="spinner"></span>
          <p>Cargando días…</p>
        </div>
      </div>`;
  }

  if (state.monthError) {
    return `
      <div class="calendar-card">
        ${nav}
        <div class="empty-state" style="min-height:250px;padding:16px">
          ${icon('alert')}
          <p>${escapeHtml(state.monthError)}</p>
          <button class="btn btn-soft btn-sm" type="button" data-action="retry-month">Reintentar</button>
        </div>
      </div>`;
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const today = localDateString();
  const days = state.monthData?.days || {};

  const blanks = Array.from({ length: startOffset }, () => '<span></span>').join('');
  const dayCells = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${pad(monthNumber)}-${pad(day)}`;
    const count = days[date] || 0;
    const disabled = count === 0;
    const classes = ['cal-day'];
    if (date === today) classes.push('is-today');
    if (count > 0) classes.push('has-slots');
    if (state.date === date) classes.push('is-selected');
    dayCells.push(
      `<button class="${classes.join(' ')}" type="button" data-date="${date}"
        ${disabled ? 'disabled' : ''} aria-label="${escapeHtml(formatDateLong(date))}${
          count > 0 ? `, ${count} horarios disponibles` : ', sin disponibilidad'
        }">${day}</button>`
    );
  }

  return `
    <div class="calendar-card">
      ${nav}
      <div class="calendar-grid" role="grid" aria-label="Calendario de disponibilidad">
        ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => `<span class="cal-weekday">${day}</span>`).join('')}
        ${blanks}
        ${dayCells.join('')}
      </div>
      <div class="calendar-legend">
        <span><span class="legend-dot"></span> Con disponibilidad</span>
        <span><span class="legend-day"></span> Hoy</span>
      </div>
    </div>`;
}

function renderSlots() {
  const title = state.date ? formatDateShort(state.date) : 'Selecciona un día';

  if (!state.date) {
    return `
      <div class="slots-panel">
        <div class="slots-head"><strong>Horarios</strong><span>${escapeHtml(title)}</span></div>
        <div class="slots-empty">
          ${icon('calendar')}
          <p>Elige un día en el calendario para ver los horarios disponibles.</p>
        </div>
      </div>`;
  }

  if (state.slotsLoading) {
    return `
      <div class="slots-panel">
        <div class="slots-head"><strong>Horarios</strong><span>${escapeHtml(title)}</span></div>
        <div class="loading-state" style="min-height:220px">
          <span class="spinner"></span>
          <p>Consultando horarios…</p>
        </div>
      </div>`;
  }

  if (state.slotsError) {
    return `
      <div class="slots-panel">
        <div class="slots-head"><strong>Horarios</strong><span>${escapeHtml(title)}</span></div>
        <div class="slots-empty">
          ${icon('alert')}
          <p>${escapeHtml(state.slotsError)}</p>
          <button class="btn btn-soft btn-sm" type="button" data-action="retry-slots">Reintentar</button>
        </div>
      </div>`;
  }

  if (state.slots.length === 0) {
    return `
      <div class="slots-panel">
        <div class="slots-head"><strong>Horarios</strong><span>${escapeHtml(title)}</span></div>
        <div class="slots-empty">
          ${icon('clock')}
          <p>No quedan horarios disponibles este día. Prueba con otra fecha.</p>
        </div>
      </div>`;
  }

  const groups = [
    { label: 'Mañana', slots: [] },
    { label: 'Tarde', slots: [] },
    { label: 'Noche', slots: [] },
  ];
  for (const slot of state.slots) {
    const hour = Number(slot.time.slice(0, 2));
    if (hour < 12) groups[0].slots.push(slot);
    else if (hour < 18) groups[1].slots.push(slot);
    else groups[2].slots.push(slot);
  }

  const groupsHtml = groups
    .filter((group) => group.slots.length > 0)
    .map(
      (group) => `
        <div class="slot-group">
          <h4>${group.label}</h4>
          <div class="slot-grid">
            ${group.slots
              .map(
                (slot) => `
                  <button class="slot-btn ${state.time === slot.time ? 'is-selected' : ''}" type="button"
                    data-time="${escapeHtml(slot.time)}">${escapeHtml(slot.time)}</button>`
              )
              .join('')}
          </div>
        </div>`
    )
    .join('');

  return `
    <div class="slots-panel">
      <div class="slots-head">
        <strong>Horarios</strong>
        <span>${escapeHtml(title)} · ${state.slots.length} disponibles</span>
      </div>
      ${groupsHtml}
      <div class="slot-hint">
        ${icon('info')}
        <span>La disponibilidad se actualiza en tiempo real. Elige tu hora y continúa.</span>
      </div>
    </div>`;
}

/* -------------------------------------------------------------------------- */
/*  Paso 4 · Datos                                                            */
/* -------------------------------------------------------------------------- */

function renderDetailsStep() {
  const service = selectedService();
  const resource = selectedResource();
  const resourceName = resource ? resource.name : 'Cualquier profesional disponible';
  const slot = selectedSlot();
  const endTime = slot ? slot.endTime : state.time;

  return `
    <div class="step-panel">
      <div class="step-panel-head">
        <div>
          <h3 class="step-title">Tus datos de contacto</h3>
          <p class="step-desc">Revisa tu cita y completa la información para confirmarla.</p>
        </div>
        <span class="step-count">Paso 4 de 4</span>
      </div>

      <div class="alert alert-info" style="margin-bottom:18px">
        ${icon('calendar')}
        <span>
          <strong>${escapeHtml(service?.name || '')}</strong> ·
          ${escapeHtml(formatDateLong(state.date))} · ${escapeHtml(state.time)}–${escapeHtml(endTime)}
          · ${escapeHtml(resourceName)}
        </span>
      </div>

      <form class="booking-form" id="booking-form" novalidate>
        <div class="form-grid">
          <label class="field full">
            <span>Nombre completo *</span>
            <input type="text" name="customer_name" autocomplete="name" required minlength="2" maxlength="100"
              placeholder="Ej. María López" value="${escapeHtml(state.formData.customer_name || '')}">
          </label>
          <label class="field">
            <span>Teléfono *</span>
            <input type="tel" name="customer_phone" autocomplete="tel" inputmode="tel" required minlength="6" maxlength="40"
              placeholder="+1 555 0100" value="${escapeHtml(state.formData.customer_phone || '')}">
          </label>
          <label class="field">
            <span>Correo electrónico <small>(opcional)</small></span>
            <input type="email" name="customer_email" autocomplete="email" maxlength="160"
              placeholder="tu@correo.com" value="${escapeHtml(state.formData.customer_email || '')}">
          </label>
          <label class="field full">
            <span>Notas para el equipo <small>(opcional)</small></span>
            <textarea name="notes" maxlength="500" rows="3"
              placeholder="Cuéntanos si necesitas algo especial…">${escapeHtml(state.formData.notes || '')}</textarea>
          </label>
        </div>
        <div class="form-note">
          ${icon('info')}
          <span>Guardaremos tu reserva con el estado <strong>${state.settings.auto_confirm === '1' ? 'confirmada' : 'pendiente de confirmación'}</strong>.
          Al terminar recibirás un código para consultarla o cancelarla.</span>
        </div>
        <div class="wizard-actions">
          <button class="btn btn-ghost" type="button" data-action="back">
            ${icon('arrow-left')} Atrás
          </button>
          <div class="wizard-actions-right">
            <span class="submit-hint">${icon('check')} Sin pagos por adelantado</span>
            <button class="btn btn-primary" type="submit" ${state.submitting ? 'disabled' : ''}>
              ${state.submitting ? 'Reservando…' : 'Confirmar reserva'}
              ${icon('check')}
            </button>
          </div>
        </div>
      </form>
    </div>`;
}

function wizardActions({ nextLabel, disabled }) {
  return `
    <div class="wizard-actions">
      ${
        state.step > 1
          ? `<button class="btn btn-ghost" type="button" data-action="back">${icon('arrow-left')} Atrás</button>`
          : '<span></span>'
      }
      <div class="wizard-actions-right">
        <span class="submit-hint">Paso ${state.step} de 4</span>
        <button class="btn btn-primary" type="button" data-action="next" ${disabled ? 'disabled' : ''}>
          ${escapeHtml(nextLabel)}
          ${icon('arrow-right')}
        </button>
      </div>
    </div>`;
}

/* -------------------------------------------------------------------------- */
/*  Confirmación                                                              */
/* -------------------------------------------------------------------------- */

function renderConfirmation() {
  const booking = state.confirmation;
  const pending = booking.status === 'pending';
  const resource = booking.resource;
  const slotEnd = booking.end_time;
  return `
    <div class="confirmation">
      <span class="confirmation-icon">${icon(pending ? 'clock' : 'check')}</span>
      <h3>${pending ? '¡Reserva recibida!' : '¡Reserva confirmada!'}</h3>
      <p>
        ${
          pending
            ? 'Tu cita quedó registrada y está pendiente de confirmación. El equipo se pondrá en contacto contigo.'
            : 'Tu cita quedó reservada. Guarda tu código para consultarla o cancelarla cuando quieras.'
        }
      </p>

      <div class="confirmation-code">
        <small>Código de reserva</small>
        <strong>${escapeHtml(booking.code)}</strong>
      </div>
      <div style="margin-top:10px">${statusBadge(booking.status)}</div>

      <div class="detail-grid">
        <div class="detail-item">
          ${icon('sparkles')}
          <div><small>Servicio</small><strong>${escapeHtml(booking.service.name)}</strong></div>
        </div>
        <div class="detail-item">
          ${icon('user')}
          <div><small>Profesional</small><strong>${escapeHtml(resource.name)}</strong></div>
        </div>
        <div class="detail-item">
          ${icon('calendar')}
          <div><small>Fecha</small><strong>${escapeHtml(formatDateLong(booking.date))}</strong></div>
        </div>
        <div class="detail-item">
          ${icon('clock')}
          <div><small>Hora</small><strong>${escapeHtml(booking.start_time)} – ${escapeHtml(slotEnd)}</strong></div>
        </div>
        <div class="detail-item">
          ${icon('coins')}
          <div><small>Precio</small><strong>${escapeHtml(formatMoney(booking.service.price))}</strong></div>
        </div>
        <div class="detail-item">
          ${icon('user')}
          <div><small>A nombre de</small><strong>${escapeHtml(booking.customer_name)}</strong></div>
        </div>
      </div>

      <div class="confirmation-actions">
        <button class="btn btn-primary" type="button" data-action="reset-booking">
          ${icon('plus')} Hacer otra reserva
        </button>
        <button class="btn btn-outline" type="button" data-action="download-ics">
          ${icon('download')} Añadir al calendario
        </button>
        <button class="btn btn-ghost" type="button" data-action="lookup-confirmation">
          ${icon('search')} Consultar reserva
        </button>
      </div>
    </div>`;
}

/* -------------------------------------------------------------------------- */
/*  Resumen lateral                                                           */
/* -------------------------------------------------------------------------- */

function renderSummary() {
  const container = $('#booking-summary');
  if (!container) return;

  const service = selectedService();
  if (!service && !state.confirmation) {
    container.innerHTML = `
      <div class="summary-empty">
        <span class="summary-empty-icon">${icon('calendar')}</span>
        <p>Completa los pasos y verás aquí el detalle de tu cita.</p>
      </div>`;
    return;
  }

  const resource = state.confirmation
    ? state.confirmation.resource
    : selectedResource();
  const resourceName = resource ? resource.name : 'Cualquiera disponible';
  const slot = selectedSlot();
  const booking = state.confirmation;
  const date = booking ? booking.date : state.date;
  const time = booking ? booking.start_time : state.time;
  const endTime = booking ? booking.end_time : slot?.endTime;
  const price = booking ? booking.service.price : service?.price;
  const duration = booking ? booking.service.duration_min : service?.duration_min;
  const serviceName = booking ? booking.service.name : service?.name;

  container.innerHTML = `
    <div class="summary-list">
      <div class="summary-item">
        <span class="summary-item-icon">${icon('sparkles')}</span>
        <div>
          <small>Servicio</small>
          <strong>${escapeHtml(serviceName || '')}</strong>
          <span>${escapeHtml(duration || '')} minutos</span>
        </div>
      </div>
      <div class="summary-item">
        <span class="summary-item-icon">${icon('user')}</span>
        <div>
          <small>Profesional</small>
          <strong>${escapeHtml(resourceName)}</strong>
          <span>${resource?.role ? escapeHtml(resource.role) : 'Te asignamos el mejor hueco'}</span>
        </div>
      </div>
      <div class="summary-item">
        <span class="summary-item-icon">${icon('calendar')}</span>
        <div>
          <small>Fecha y hora</small>
          <strong>${date ? escapeHtml(formatDateLong(date)) : 'Por elegir'}</strong>
          <span>${time ? `${escapeHtml(time)}${endTime ? ` – ${escapeHtml(endTime)}` : ''}` : 'Selecciona un horario'}</span>
        </div>
      </div>
    </div>
    ${
      price !== undefined && price !== null
        ? `<div class="summary-total"><span>Total estimado</span><strong>${escapeHtml(formatMoney(price))}</strong></div>`
        : ''
    }
    ${
      booking
        ? `<div class="summary-status">
             <span>Estado</span>
             ${statusBadge(booking.status)}
           </div>
           <div class="summary-help">${icon('info')}<p>Código <strong>${escapeHtml(booking.code)}</strong>. Puedes consultarlo o cancelarlo cuando quieras.</p></div>`
        : ''
    }`;
}

/* -------------------------------------------------------------------------- */
/*  Consulta y cancelación de reservas                                        */
/* -------------------------------------------------------------------------- */

function openLookup(code = '') {
  if (!lookupModal) return;
  state.lastFocus = document.activeElement;
  lookupModal.hidden = false;
  document.body.style.overflow = 'hidden';
  const input = $('#lookup-code');
  if (input) {
    input.value = String(code || '').toUpperCase();
    setTimeout(() => input.focus(), 50);
  }
  if (!code) {
    const result = $('#lookup-result');
    if (result) result.innerHTML = '';
  }
}

function closeLookup() {
  if (!lookupModal) return;
  lookupModal.hidden = true;
  document.body.style.overflow = '';
  if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
    state.lastFocus.focus();
  }
}

async function searchBooking(codeInput) {
  const code = String(codeInput || '').trim().toUpperCase();
  const result = $('#lookup-result');
  if (!result) return;

  if (!code) {
    result.innerHTML = `<div class="alert alert-error">${icon('alert')} Escribe el código de tu reserva.</div>`;
    return;
  }

  result.innerHTML = `<div class="loading-state" style="min-height:120px"><span class="spinner"></span><p>Buscando reserva…</p></div>`;

  try {
    const data = await api(`/api/bookings/code/${encodeURIComponent(code)}`);
    state.lookupBooking = data.booking;
    renderLookup(data.booking);
  } catch (error) {
    state.lookupBooking = null;
    result.innerHTML = `<div class="alert alert-error">${icon('alert')} ${escapeHtml(error.message)}</div>`;
  }
}

function renderLookup(booking) {
  const result = $('#lookup-result');
  if (!result) return;
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  result.innerHTML = `
    <div class="lookup-booking">
      <div class="lookup-booking-head">
        <strong>${escapeHtml(booking.code)}</strong>
        ${statusBadge(booking.status)}
      </div>
      <div class="lookup-booking-body">
        <div class="detail-grid">
          <div class="detail-item">
            ${icon('sparkles')}
            <div><small>Servicio</small><strong>${escapeHtml(booking.service.name)}</strong></div>
          </div>
          <div class="detail-item">
            ${icon('user')}
            <div><small>Profesional</small><strong>${escapeHtml(booking.resource.name)}</strong></div>
          </div>
          <div class="detail-item">
            ${icon('calendar')}
            <div><small>Fecha</small><strong>${escapeHtml(formatDateLong(booking.date))}</strong></div>
          </div>
          <div class="detail-item">
            ${icon('clock')}
            <div><small>Hora</small><strong>${escapeHtml(booking.start_time)} – ${escapeHtml(booking.end_time)}</strong></div>
          </div>
          <div class="detail-item">
            ${icon('user')}
            <div><small>A nombre de</small><strong>${escapeHtml(booking.customer_name)}</strong></div>
          </div>
          <div class="detail-item">
            ${icon('coins')}
            <div><small>Precio</small><strong>${escapeHtml(formatMoney(booking.service.price))}</strong></div>
          </div>
        </div>
      </div>
      <div class="lookup-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-lookup-download>
          ${icon('download')} Calendario
        </button>
        ${
          canCancel
            ? `<button class="btn btn-danger btn-sm" type="button" data-cancel-code="${escapeHtml(booking.code)}">
                 ${icon('ban')} Cancelar reserva
               </button>`
            : ''
        }
      </div>
    </div>`;
}

async function handleLookupAction(event) {
  if (event.target.closest('[data-lookup-download]')) {
    if (state.lookupBooking) downloadIcs(state.lookupBooking);
    return;
  }

  const cancelButton = event.target.closest('[data-cancel-code]');
  if (!cancelButton) return;
  const code = cancelButton.dataset.cancelCode;
  if (!window.confirm('¿Seguro que quieres cancelar esta reserva?')) return;

  cancelButton.disabled = true;
  cancelButton.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Cancelando…`;
  try {
    const data = await api(`/api/bookings/code/${encodeURIComponent(code)}/cancel`, {
      method: 'POST',
    });
    state.lookupBooking = data.booking;
    renderLookup(data.booking);
    toast('La reserva fue cancelada', 'success');
    if (state.confirmation && state.confirmation.code === code) {
      state.confirmation = data.booking;
      render();
    }
  } catch (error) {
    toast(error.message, 'error');
    renderLookup(state.lookupBooking);
  }
}

/* -------------------------------------------------------------------------- */
/*  Calendario ICS y avisos                                                   */
/* -------------------------------------------------------------------------- */

function downloadIcs(booking) {
  if (!booking) return;
  const escapeIcs = (value) =>
    String(value ?? '')
      .replaceAll('\\', '\\\\')
      .replaceAll(';', '\\;')
      .replaceAll(',', '\\,')
      .replaceAll(/\r?\n/g, '\\n');
  const compactDate = booking.date.replaceAll('-', '');
  const compactStart = booking.start_time.replace(':', '');
  const compactEnd = booking.end_time.replace(':', '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ReservaFacil//Sistema de reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.code}@reservafacil`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compactDate}T${compactStart}00`,
    `DTEND:${compactDate}T${compactEnd}00`,
    `SUMMARY:${escapeIcs(booking.service.name)} · ${escapeIcs(state.settings.business_name)}`,
    `DESCRIPTION:${escapeIcs(`Reserva ${booking.code} con ${booking.resource.name}`)}`,
    `LOCATION:${escapeIcs(state.settings.address || '')}`,
    `STATUS:${booking.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reserva-${booking.code}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
