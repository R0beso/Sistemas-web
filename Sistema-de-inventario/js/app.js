/* ============================================================
   App — arranque, navegación entre vistas y acciones globales
   ============================================================ */

window.App = (() => {
  const VIEWS = ['productos', 'movimientos', 'reportes'];
  let current = 'productos';

  /* ================= Navegación ================= */

  function switchView(name) {
    if (!VIEWS.includes(name)) name = 'productos';
    current = name;

    VIEWS.forEach(v => {
      document.getElementById(`view-${v}`).classList.toggle('hidden', v !== name);
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const active = btn.dataset.view === name;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
    window.scrollTo({ top: 0 });
    renderAll();
  }

  /* ================= Render global ================= */

  function renderAll() {
    InventoryView.render();
    MovementsView.render();
    ReportsView.render();
    refreshBadges();
  }

  function refreshBadges() {
    const badge = document.getElementById('badge-low');
    const count = Store.getProducts().filter(p => Store.stockStatus(p) !== 'ok').length;
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  }

  /* ================= Acciones globales (data-action) ================= */

  async function handleAction(action) {
    switch (action) {
      case 'new-product':
        InventoryView.openNew();
        break;

      case 'show-low-stock':
        InventoryView.showLowStock();
        break;

      case 'export-json':
        Store.exportJSON();
        break;

      case 'export-csv':
        Store.exportCSV();
        break;

      case 'import-json':
        document.getElementById('file-import').click();
        break;

      case 'copy-list':
        ReportsView.copyShoppingList();
        break;

      case 'reset-seed': {
        const ok = await UI.confirmDialog({
          title: 'Restaurar datos de ejemplo',
          message: 'Se reemplazarán todos los productos y movimientos actuales por los datos de ejemplo. Esta acción no se puede deshacer.',
          confirmLabel: 'Restaurar',
          danger: true,
        });
        if (ok) {
          Store.resetSeed();
          UI.toast('Datos de ejemplo restaurados.');
          renderAll();
        }
        break;
      }

      case 'clear-all': {
        const ok = await UI.confirmDialog({
          title: 'Vaciar inventario',
          message: 'Se eliminarán todos los productos y movimientos. Te recomendamos exportar un respaldo antes. Esta acción no se puede deshacer.',
          confirmLabel: 'Vaciar todo',
          danger: true,
        });
        if (ok) {
          Store.clearAll();
          UI.toast('Inventario vaciado.', 'warn');
          renderAll();
        }
        break;
      }
    }
  }

  /* ================= Init ================= */

  function init() {
    Store.init();
    UI.hydrateIcons();

    InventoryView.init();
    MovementsView.init();
    ReportsView.init();

    // Navegación del sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    window.addEventListener('hashchange', () => {
      const name = location.hash.replace('#', '');
      if (name !== current) switchView(name);
    });

    // Acciones globales por delegación
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn) { handleAction(btn.dataset.action); return; }

      // Cerrar modal: botón con data-close o clic fuera del diálogo
      if (e.target.closest('[data-close]')) { UI.closeModal(); return; }
      if (e.target.id === 'modal-overlay') UI.closeModal();
    });

    // Escape cierra el modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && UI.isModalOpen()) UI.closeModal();
    });

    // Importar respaldo
    const fileInput = document.getElementById('file-import');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = Store.importJSON(String(reader.result));
        if (result.ok) {
          UI.toast(`Respaldo importado: ${UI.int(result.count)} producto(s).`);
          renderAll();
        } else {
          UI.toast(result.message, 'error');
        }
      };
      reader.onerror = () => UI.toast('No se pudo leer el archivo.', 'error');
      reader.readAsText(file);
    });

    // Vista inicial según el hash
    switchView(location.hash.replace('#', '') || 'productos');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { renderAll, switchView };
})();
