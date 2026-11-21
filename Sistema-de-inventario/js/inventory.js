/* ============================================================
   InventoryView — productos: CRUD, búsqueda, filtros y alertas
   ============================================================ */

window.InventoryView = (() => {
  const filters = { search: '', category: '', status: '' };
  let els = {};

  /* ================= Consulta con filtros ================= */

  function filteredProducts() {
    const q = filters.search.trim().toLowerCase();
    return Store.getProducts()
      .filter(p => {
        if (filters.category && p.category !== filters.category) return false;
        if (filters.status) {
          const st = Store.stockStatus(p);
          if (filters.status === 'alert' ? st === 'ok' : st !== filters.status) return false;
        }
        if (!q) return true;
        return p.name.toLowerCase().includes(q) ||
               p.sku.toLowerCase().includes(q) ||
               p.category.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  /* ================= Filas de la tabla ================= */

  const STATUS = {
    ok: { cls: 'badge-ok', label: 'Stock OK' },
    low: { cls: 'badge-low', label: '⚠ Stock bajo' },
    out: { cls: 'badge-out', label: 'Agotado' },
  };

  function rowHTML(p) {
    const st = Store.stockStatus(p);
    const info = STATUS[st];
    return `
      <tr data-id="${p.id}">
        <td class="mono">${UI.esc(p.sku)}</td>
        <td>
          <div class="cell-title">${UI.esc(p.name)}</div>
          <div class="cell-sub">${UI.esc(p.category)}${p.description ? ' · ' + UI.esc(p.description) : ''}</div>
        </td>
        <td>
          <div class="stock-line">
            <span class="stock-num">${UI.int(p.quantity)}</span> u.
            <span class="badge ${info.cls}">${info.label}</span>
          </div>
          <div class="cell-sub">mínimo ${UI.int(p.minStock)}</div>
        </td>
        <td class="right num">${UI.money(p.price)}</td>
        <td class="right num strong">${UI.money(p.price * p.quantity)}</td>
        <td>
          <div class="actions">
            <button class="icon-btn" type="button" data-act="entrada" title="Registrar entrada">${UI.icon('plus', 16)}</button>
            <button class="icon-btn" type="button" data-act="salida" title="Registrar salida" ${p.quantity === 0 ? 'disabled' : ''}>${UI.icon('minus', 16)}</button>
            <button class="icon-btn" type="button" data-act="edit" title="Editar producto">${UI.icon('edit', 16)}</button>
            <button class="icon-btn danger" type="button" data-act="delete" title="Eliminar producto">${UI.icon('trash', 16)}</button>
          </div>
        </td>
      </tr>`;
  }

  /* ================= Modal de producto (crear / editar) ================= */

  function productFormHTML(product) {
    const isEdit = !!product;
    const categories = Store.getCategories();
    return `
      <form id="product-form" novalidate>
        <div class="modal-head">
          <div>
            <h2>${isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
            <p class="muted small">${isEdit ? 'Actualiza los datos del producto.' : 'Agrega un producto al inventario.'}</p>
          </div>
          <button type="button" class="icon-btn" data-close aria-label="Cerrar">${UI.icon('close')}</button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>SKU *</span>
            <input type="text" name="sku" data-autofocus autocomplete="off" placeholder="Ej. ELEC-004" value="${UI.esc(product?.sku || '')}">
            <span class="field-error hidden"></span>
          </label>
          <label class="field">
            <span>Nombre *</span>
            <input type="text" name="name" autocomplete="off" placeholder="Ej. Monitor Dell 24&quot;" value="${UI.esc(product?.name || '')}">
            <span class="field-error hidden"></span>
          </label>
          <label class="field">
            <span>Categoría</span>
            <input type="text" name="category" list="category-list" placeholder="Selecciona o escribe una nueva" value="${UI.esc(product?.category || '')}">
            <datalist id="category-list">${categories.map(c => `<option value="${UI.esc(c)}"></option>`).join('')}</datalist>
          </label>
          <label class="field">
            <span>Precio unitario *</span>
            <input type="number" name="price" min="0" step="0.01" placeholder="0.00" value="${product ? product.price : ''}">
            <span class="field-error hidden"></span>
          </label>
          <label class="field">
            <span>Cantidad en stock *</span>
            <input type="number" name="quantity" min="0" step="1" placeholder="0" value="${product ? product.quantity : 0}">
            <span class="field-error hidden"></span>
            ${isEdit ? '<span class="muted small">Si cambias la cantidad se registrará un ajuste en el historial.</span>' : ''}
          </label>
          <label class="field">
            <span>Stock mínimo (alerta) *</span>
            <input type="number" name="minStock" min="0" step="1" placeholder="0" value="${product ? product.minStock : 0}">
            <span class="field-error hidden"></span>
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            <span>Descripción / notas</span>
            <textarea name="description" rows="2" placeholder="Opcional">${UI.esc(product?.description || '')}</textarea>
          </label>
        </div>
        <p class="form-error hidden" id="product-form-error"></p>
        <div class="modal-foot">
          <button type="button" class="btn" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">${UI.icon('check', 16)} ${isEdit ? 'Guardar cambios' : 'Agregar producto'}</button>
        </div>
      </form>`;
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach(s => { s.textContent = ''; s.classList.add('hidden'); });
    form.querySelectorAll('input.invalid').forEach(i => i.classList.remove('invalid'));
    const summary = form.querySelector('#product-form-error');
    if (summary) { summary.textContent = ''; summary.classList.add('hidden'); }
  }

  function showFieldErrors(form, errors) {
    clearFieldErrors(form);
    Object.entries(errors).forEach(([field, message]) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('invalid');
        const span = input.parentElement.querySelector('.field-error');
        if (span) { span.textContent = message; span.classList.remove('hidden'); }
      }
    });
    const summary = form.querySelector('#product-form-error');
    if (summary) {
      summary.textContent = errors.global || 'Revisa los campos marcados e inténtalo de nuevo.';
      summary.classList.remove('hidden');
    }
  }

  function openProductModal(product = null) {
    UI.openModal(productFormHTML(product), {
      onMount(box) {
        const form = box.querySelector('#product-form');
        form.addEventListener('submit', e => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(form).entries());
          const result = product ? Store.updateProduct(product.id, data) : Store.addProduct(data);
          if (!result.ok) { showFieldErrors(form, result.errors); return; }
          UI.closeModal();
          UI.toast(product ? `Producto “${result.product.name}” actualizado.` : `Producto “${result.product.name}” agregado.`);
          App.renderAll();
        });
      },
    });
  }

  /* ================= Eliminar ================= */

  async function removeProduct(id) {
    const product = Store.getProduct(id);
    if (!product) return;
    const movements = Store.getMovementsOf(id).length;
    const ok = await UI.confirmDialog({
      title: 'Eliminar producto',
      message: `Se eliminará “${product.name}” (${product.sku}) del inventario. ` +
        `${movements ? `Su historial de ${movements} movimiento(s) se conservará.` : ''} Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    Store.deleteProduct(id);
    UI.toast(`Producto “${product.name}” eliminado.`, 'warn');
    App.renderAll();
  }

  /* ================= Banner y resumen ================= */

  function pendingAlerts() {
    return Store.getProducts().filter(p => Store.stockStatus(p) !== 'ok');
  }

  function render() {
    // Resumen
    const s = Store.stats();
    els.summary.textContent = s.skus === 0
      ? 'Aún no hay productos registrados.'
      : `${UI.int(s.skus)} producto(s) · ${UI.int(s.units)} unidades · ${UI.money(s.value)} en inventario.`;

    // Categorías del filtro
    const cats = Store.getCategories();
    const wanted = cats.filter(c => Store.getProducts().some(p => p.category === c));
    els.category.innerHTML = '<option value="">Todas las categorías</option>' +
      wanted.map(c => `<option value="${UI.esc(c)}" ${c === filters.category ? 'selected' : ''}>${UI.esc(c)}</option>`).join('');
    if (!wanted.includes(filters.category)) filters.category = '';

    // Banner de alertas
    const alerts = pendingAlerts();
    const outCount = alerts.filter(p => Store.stockStatus(p) === 'out').length;
    els.banner.classList.toggle('hidden', alerts.length === 0);
    els.bannerText.textContent =
      `${UI.int(alerts.length)} producto(s) requieren reabastecimiento` +
      (outCount ? ` (${UI.int(outCount)} agotado/s)` : '') + '.';

    // Tabla
    const list = filteredProducts();
    els.body.innerHTML = list.map(rowHTML).join('');
    els.empty.classList.toggle('hidden', list.length > 0);
    els.body.closest('.table-scroll').classList.toggle('hidden', list.length === 0);
  }

  /* ================= Init ================= */

  function init() {
    els = {
      summary: document.getElementById('products-summary'),
      body: document.getElementById('products-body'),
      empty: document.getElementById('products-empty'),
      search: document.getElementById('search-input'),
      category: document.getElementById('filter-category'),
      status: document.getElementById('filter-status'),
      banner: document.getElementById('low-stock-banner'),
      bannerText: document.getElementById('low-stock-text'),
    };

    els.search.addEventListener('input', () => { filters.search = els.search.value; render(); });
    els.category.addEventListener('change', () => { filters.category = els.category.value; render(); });
    els.status.addEventListener('change', () => { filters.status = els.status.value; render(); });

    // Acciones de la tabla (delegación de eventos)
    els.body.addEventListener('click', e => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.closest('tr').dataset.id;
      const act = btn.dataset.act;
      if (act === 'edit') openProductModal(Store.getProduct(id));
      else if (act === 'delete') removeProduct(id);
      else if (act === 'entrada' || act === 'salida') MovementsView.openQuickModal(id, act);
    });
  }

  function showLowStock() {
    filters.status = 'alert';
    els.status.value = 'alert';
    render();
  }

  function openNew() { openProductModal(null); }

  return { init, render, openNew, showLowStock };
})();
