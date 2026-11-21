/* ============================================================
   UI — utilidades compartidas: iconos, formato, toasts, modales
   ============================================================ */

window.UI = (() => {
  // Cambia aquí la moneda si lo necesitas: 'MXN', 'USD', 'EUR', 'COP', 'ARS', 'PEN', 'CLP'…
  const CURRENCY = 'MXN';

  const moneyFmt = new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: CURRENCY,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const intFmt = new Intl.NumberFormat('es-MX');
  const dateFmt = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const money = n => moneyFmt.format(Number(n) || 0);
  const int = n => intFmt.format(Number(n) || 0);

  function date(iso) {
    try { return dateFmt.format(new Date(iso)).replace(',', ''); }
    catch (e) { return '—'; }
  }

  // Escapa texto del usuario antes de insertarlo en el HTML
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  /* ----- Iconos (SVG inline estilo Feather) ----- */

  const ICONS = {
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 13"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  };

  function icon(name, size = 18) {
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
      `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
      `aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  // Rellena todos los <span data-icon="nombre"> del documento
  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.iconDone) return;
      el.innerHTML = icon(el.dataset.icon, Number(el.dataset.iconSize) || 18);
      el.dataset.iconDone = '1';
    });
  }

  /* ----- Toasts ----- */

  function toast(message, type = 'success', ms = 3400) {
    const box = document.getElementById('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const glyph = type === 'success' ? 'check' : type === 'error' ? 'x' : 'alert';
    el.innerHTML = `${icon(glyph, 17)}<span>${esc(message)}</span>`;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    }, ms);
  }

  /* ----- Modal ----- */

  let lastFocus = null;

  function openModal(html, { onMount } = {}) {
    lastFocus = document.activeElement;
    const overlay = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    box.innerHTML = html;
    hydrateIcons(box);
    overlay.classList.remove('hidden');
    document.body.classList.add('no-scroll');
    const first = box.querySelector('[data-autofocus]') || box.querySelector('input, select, textarea, button');
    if (first) first.focus();
    if (typeof onMount === 'function') onMount(box);
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    box.innerHTML = '';
    document.body.classList.remove('no-scroll');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function isModalOpen() {
    const overlay = document.getElementById('modal-overlay');
    return !!overlay && !overlay.classList.contains('hidden');
  }

  // Diálogo de confirmación (devuelve una promesa booleana)
  function confirmDialog({
    title = '¿Confirmar?',
    message = '',
    confirmLabel = 'Aceptar',
    cancelLabel = 'Cancelar',
    danger = false,
  } = {}) {
    return new Promise(resolve => {
      openModal(`
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('close')}</button>
        </div>
        <p class="confirm-message">${esc(message)}</p>
        <div class="modal-foot">
          <button type="button" class="btn" data-close>${esc(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${esc(confirmLabel)}</button>
        </div>
      `);
      const overlay = document.getElementById('modal-overlay');
      overlay.querySelector('#confirm-ok').addEventListener('click', () => {
        closeModal();
        resolve(true);
      });
      // Si el modal se cierra sin confirmar, resuelve en falso
      const observer = new MutationObserver(() => {
        if (overlay.classList.contains('hidden')) {
          observer.disconnect();
          resolve(false);
        }
      });
      observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ----- Helpers ----- */

  // Fecha local en formato para <input type="datetime-local">
  function toLocalInput(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function download(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  return {
    money, int, date, esc, icon, hydrateIcons,
    toast, openModal, closeModal, isModalOpen, confirmDialog,
    toLocalInput, download, copyText, todayISO,
    CURRENCY,
  };
})();
