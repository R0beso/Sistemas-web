/* ============================================================
   MovementsView — registro de entradas/salidas/ajustes e historial
   ============================================================ */

window.MovementsView = (() => {
  const TYPE_LABEL = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' };

  const filters = { search: '', type: '' };
  let els = {};

  /* ================= Formularios ================= */

  function formHTML({ prefix, productId = '', type = 'entrada' } = {}) {
    return `
      <div class="card-head">
        <h2>Registrar movimiento</h2>
        <p class="muted small">Las entradas agregan existencia, las salidas la reducen y los ajustes fijan el conteo real.</p>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Producto *</span>
          <select name="productId" id="${prefix}-product"></select>
        </label>
        <div class="field">
          <span>Tipo de movimiento *</span>
          <div class="segmented" id="${prefix}-type" role="group" aria-label="Tipo de movimiento">
            <button type="button" class="seg ${type === 'entrada' ? 'active' : ''}" data-type="entrada">${UI.icon('plus', 15)} Entrada</button>
            <button type="button" class="seg ${type === 'salida' ? 'active' : ''}" data-type="salida">${UI.icon('minus', 15)} Salida</button>
            <button type="button" class="seg ${type === 'ajuste' ? 'active' : ''}" data-type="ajuste">${UI.icon('edit', 15)} Ajuste</button>
          </div>
          <input type="hidden" name="type" value="${type}">
        </div>
        <label class="field">
          <span>Cantidad *</span>
          <input type="number" name="quantity" min="0" step="1" placeholder="0" data-autofocus>
        </label>
        <label class="field">
          <span>Fecha y hora</span>
          <input type="datetime-local" name="date" value="${UI.toLocalInput()}">
        </label>
        <label class="field" style="grid-column: 1 / -1;">
          <span>Nota / motivo</span>
          <input type="text" name="note" placeholder="Ej. Compra a proveedor, venta a cliente, conteo físico…">
        </label>
      </div>
      <p class="form-error hidden" id="${prefix}-error"></p>
      <div class="form-foot">
        <span class="muted small" id="${prefix}-hint">—</span>
        <div>
          <button type="submit" class="btn btn-primary">${UI.icon('swap', 16)} Registrar movimiento</button>
        </div>
      </div>`;
  }

  function fillProductSelect(select, selectedId) {
    const products = Store.getProducts().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    select.innerHTML = '<option value="">— Selecciona un producto —</option>' +
      products.map(p =>
        `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${UI.esc(p.name)} (${UI.esc(p.sku)}) · stock ${p.quantity}</option>`
      ).join('');
    if (selectedId && !products.some(p => p.id === selectedId)) select.value = '';
  }

  function setActiveType(container, type) {
    container.querySelectorAll('.seg').forEach(b => b.classList.toggle('active', b.dataset.type === type));
    container.parentElement.querySelector('input[type="hidden"]').value = type;
  }

  function activeType(container) {
    return container.parentElement.querySelector('input[type="hidden"]').value;
  }

  function updateHint(prefix, type) {
    const hint = document.getElementById(`${prefix}-hint`);
    if (!hint) return;
    const select = document.getElementById(`${prefix}-product`);
    const product = select && select.value ? Store.getProduct(select.value) : null;
    if (!product) {
      hint.textContent = 'Selecciona un producto para ver su stock actual.';
    } else if (type === 'ajuste') {
      hint.innerHTML = `Stock actual: <strong>${UI.int(product.quantity)}</strong> u. · la cantidad indicada será la nueva existencia real.`;
    } else {
      hint.innerHTML = `Stock actual: <strong>${UI.int(product.quantity)}</strong> u. · mínimo ${UI.int(product.minStock)}.`;
    }
  }

  function showError(prefix, errors) {
    const box = document.getElementById(`${prefix}-error`);
    const messages = Object.values(errors);
    if (!messages.length) { hideError(prefix); return; }
    if (box) {
      box.textContent = messages[0];
      box.classList.remove('hidden');
    }
  }

  function hideError(prefix) {
    const box = document.getElementById(`${prefix}-error`);
    if (box) { box.textContent = ''; box.classList.add('hidden'); }
  }

  /* Envío compartido entre el formulario de la vista y el modal rápido */
  function submitForm(container, prefix, { closeModalAfter = false } = {}) {
    const data = {
      productId: container.querySelector(`#${prefix}-product`).value,
      type: activeType(container.querySelector(`#${prefix}-type`)),
      quantity: container.querySelector('input[name="quantity"]').value,
      date: container.querySelector('input[name="date"]').value,
      note: container.querySelector('input[name="note"]').value,
    };

    const result = Store.registerMovement(data);
    if (!result.ok) {
      showError(prefix, result.errors);
      return false;
    }

    hideError(prefix);
    const m = result.movement;
    const amount = data.type === 'ajuste'
      ? `${UI.int(m.previousQuantity)} → ${UI.int(m.newQuantity)}`
      : `${UI.int(m.quantity)} u.`;
    UI.toast(`${TYPE_LABEL[m.type]} registrada (${amount}) en “${result.product.name}”. Nuevo stock: ${UI.int(m.newQuantity)} u.`);
    App.renderAll();
    if (closeModalAfter) UI.closeModal();
    return true;
  }

  /* ================= Modal rápido (desde la tabla de productos) ================= */

  function openQuickModal(productId, type = 'entrada') {
    const product = Store.getProduct(productId);
    if (!product) return;

    UI.openModal(`
      <div class="modal-head">
        <div>
          <h2>Registrar movimiento</h2>
          <p class="muted small">${UI.esc(product.name)} · ${UI.esc(product.sku)}</p>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">${UI.icon('close')}</button>
      </div>
      <form id="qmove-form" novalidate>${formHTML({ prefix: 'q', productId, type })}</form>
    `, {
      onMount(box) {
        const form = box.querySelector('#qmove-form');
        fillProductSelect(form.querySelector('#q-product'), productId);
        setActiveType(form.querySelector('#q-type'), type);
        updateHint('q', type);

        form.addEventListener('click', e => {
          const seg = e.target.closest('.seg');
          if (!seg) return;
          setActiveType(form.querySelector('#q-type'), seg.dataset.type);
          hideError('q');
          updateHint('q', seg.dataset.type);
        });
        form.querySelector('#q-product').addEventListener('change', () => {
          hideError('q');
          updateHint('q', activeType(form.querySelector('#q-type')));
        });
        form.addEventListener('submit', e => {
          e.preventDefault();
          submitForm(form, 'q', { closeModalAfter: true });
        });
      },
    });
  }

  /* ================= Historial ================= */

  function filteredMovements() {
    const q = filters.search.trim().toLowerCase();
    return Store.getMovements().filter(m => {
      if (filters.type && m.type !== filters.type) return false;
      if (!q) return true;
      return (m.productName || '').toLowerCase().includes(q) ||
             (m.productSku || '').toLowerCase().includes(q) ||
             (m.note || '').toLowerCase().includes(q);
    });
  }

  function movementRow(m) {
    const delta = m.newQuantity - m.previousQuantity;
    const deltaText = m.type === 'ajuste'
      ? `<span class="delta-adj">${UI.int(m.previousQuantity)} → ${UI.int(m.newQuantity)}</span>`
      : delta > 0
        ? `<span class="delta-in">+${UI.int(delta)}</span>`
        : `<span class="delta-out">−${UI.int(Math.abs(delta))}</span>`;

    return `
      <tr>
        <td class="num">${UI.date(m.date)}</td>
        <td>
          <div class="cell-title">${UI.esc(m.productName || 'Producto eliminado')}</div>
          <div class="cell-sub mono">${UI.esc(m.productSku || '')}</div>
        </td>
        <td><span class="badge badge-${m.type}">${TYPE_LABEL[m.type]}</span></td>
        <td class="right num">${deltaText}</td>
        <td class="right num">${UI.int(m.previousQuantity)} → <strong>${UI.int(m.newQuantity)}</strong></td>
        <td class="cell-note">${UI.esc(m.note) || '—'}</td>
      </tr>`;
  }

  /* ================= Render ================= */

  function render() {
    // Formulario principal
    if (els.form && !els.form.innerHTML.trim()) {
      els.form.innerHTML = formHTML({ prefix: 'm' });
      bindFormEvents(els.form, 'm');
    }
    const productSelect = els.form.querySelector('#m-product');
    if (productSelect) {
      const prev = productSelect.value;
      fillProductSelect(productSelect, prev);
      updateHint('m', activeType(els.form.querySelector('#m-type')));
    }
    const dateInput = els.form.querySelector('input[name="date"]');
    if (dateInput && !dateInput.value) dateInput.value = UI.toLocalInput();

    // Historial
    const list = filteredMovements();
    els.body.innerHTML = list.map(movementRow).join('');
    els.empty.classList.toggle('hidden', list.length > 0);
    els.body.closest('.table-scroll').classList.toggle('hidden', list.length === 0);

    const all = Store.getMovements().length;
    els.summary.textContent = all === 0
      ? 'Registro de entradas, salidas y ajustes de stock.'
      : `${UI.int(all)} movimiento(s) en total · mostrando ${UI.int(list.length)}.`;
  }

  function bindFormEvents(form, prefix) {
    const typeBox = form.querySelector(`#${prefix}-type`);
    form.addEventListener('click', e => {
      const seg = e.target.closest('.seg');
      if (!seg) return;
      setActiveType(typeBox, seg.dataset.type);
      hideError(prefix);
      updateHint(prefix, seg.dataset.type);
    });
    form.querySelector('#' + prefix + '-product').addEventListener('change', () => {
      hideError(prefix);
      updateHint(prefix, activeType(typeBox));
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      submitForm(form, prefix);
      form.querySelector('input[name="quantity"]').value = '';
    });
  }

  function init() {
    els = {
      form: document.getElementById('movement-form'),
      body: document.getElementById('movements-body'),
      empty: document.getElementById('movements-empty'),
      summary: document.getElementById('movements-summary'),
      search: document.getElementById('move-search'),
      typeFilter: document.getElementById('move-filter-type'),
    };

    els.search.addEventListener('input', () => { filters.search = els.search.value; render(); });
    els.typeFilter.addEventListener('change', () => { filters.type = els.typeFilter.value; render(); });
  }

  return { init, render, openQuickModal };
})();
