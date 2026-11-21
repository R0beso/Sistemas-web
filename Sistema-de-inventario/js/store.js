/* ============================================================
   Store — capa de datos sobre localStorage
   Modelos:
     Product   { id, sku, name, category, description,
                 quantity, minStock, price, createdAt, updatedAt }
     Movement  { id, productId, productSku, productName,
                 type: 'entrada' | 'salida' | 'ajuste',
                 quantity, previousQuantity, newQuantity, date, note }
   ============================================================ */

window.Store = (() => {
  const KEY = 'sistema-inventario.v1';

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let state = null;

  /* ================= Datos de ejemplo ================= */

  function seed() {
    const now = Date.now();
    const DAY = 86400000;
    const at = daysAgo => new Date(now - daysAgo * DAY).toISOString();

    const defs = [
      { sku: 'ELEC-001', name: 'Laptop Lenovo IdeaPad 3', category: 'Electrónica', price: 14500, minStock: 3, desc: 'Ryzen 5 · 8 GB RAM · 256 GB SSD', start: 20, out: [[8, 3, 'Venta a cliente']] },
      { sku: 'ELEC-002', name: 'Mouse inalámbrico Logitech M170', category: 'Electrónica', price: 320, minStock: 10, desc: '', start: 45, out: [[5, 2, 'Venta a cliente']] },
      { sku: 'ELEC-003', name: 'Teclado mecánico Redragon Kumara', category: 'Electrónica', price: 1150, minStock: 10, desc: 'Switches azules', start: 8, out: [] },
      { sku: 'OFI-001', name: 'Resma de papel carta 75 g', category: 'Oficina', price: 145, minStock: 20, desc: '', start: 120, out: [[20, 4, 'Uso interno']] },
      { sku: 'OFI-002', name: 'Marcadores permanentes (caja 12)', category: 'Oficina', price: 95, minStock: 5, desc: '', start: 10, out: [[10, 1, 'Venta a cliente']] },
      { sku: 'LIM-001', name: 'Desinfectante multiusos 1 L', category: 'Limpieza', price: 65, minStock: 8, desc: '', start: 30, out: [[5, 2, 'Uso interno']] },
      { sku: 'HER-001', name: 'Taladro Bosch 650 W', category: 'Herramientas', price: 1890, minStock: 2, desc: '', start: 6, out: [[1, 5, 'Préstamo a taller']] },
      { sku: 'HER-002', name: 'Juego de llaves 10 piezas', category: 'Herramientas', price: 430, minStock: 4, desc: '', start: 14, out: [] },
    ];

    const products = [];
    const movements = [];

    defs.forEach(d => {
      let qty = d.start;
      const createdAt = at(12);
      const product = {
        id: uid(),
        sku: d.sku,
        name: d.name,
        category: d.category,
        description: d.desc,
        quantity: d.start,
        minStock: d.minStock,
        price: d.price,
        createdAt,
        updatedAt: createdAt,
      };
      products.push(product);
      movements.push(makeMovement(product, 'entrada', d.start, 0, d.start, at(12), 'Compra a proveedor'));

      d.out.forEach(([q, daysAgo, note]) => {
        const prev = qty;
        qty -= q;
        movements.push(makeMovement(product, 'salida', q, prev, qty, at(daysAgo), note));
      });

      product.quantity = qty;
    });

    movements.sort((a, b) => new Date(a.date) - new Date(b.date));
    return { version: 1, products, movements };
  }

  function makeMovement(product, type, quantity, previousQuantity, newQuantity, date, note) {
    return {
      id: uid(),
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      type,
      quantity,
      previousQuantity,
      newQuantity,
      date: date || new Date().toISOString(),
      note: note || '',
    };
  }

  /* ================= Persistencia ================= */

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
      UI.toast('No se pudo guardar en el navegador (localStorage)', 'error');
    }
  }

  function normalize(raw) {
    return {
      version: 1,
      products: (raw.products || []).map(p => ({
        id: p.id || uid(),
        sku: String(p.sku || '').trim(),
        name: String(p.name || '').trim(),
        category: String(p.category || 'Otros').trim() || 'Otros',
        description: String(p.description || ''),
        quantity: Math.max(0, Math.floor(Number(p.quantity) || 0)),
        minStock: Math.max(0, Math.floor(Number(p.minStock) || 0)),
        price: Math.max(0, Number(p.price) || 0),
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
      })),
      movements: (raw.movements || []).map(m => ({
        id: m.id || uid(),
        productId: m.productId,
        productSku: m.productSku || '',
        productName: m.productName || '',
        type: ['entrada', 'salida', 'ajuste'].includes(m.type) ? m.type : 'ajuste',
        quantity: Number(m.quantity) || 0,
        previousQuantity: Number(m.previousQuantity) || 0,
        newQuantity: Number(m.newQuantity) || 0,
        date: m.date || new Date().toISOString(),
        note: String(m.note || ''),
      })),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.movements)) {
          return normalize(parsed);
        }
      }
    } catch (e) {
      console.warn('No se pudo leer localStorage, se inicia con datos de ejemplo.', e);
    }
    const fresh = seed();
    state = fresh;
    persist();
    return fresh;
  }

  /* ================= Lectura ================= */

  const getProducts = () => [...state.products];

  const getProduct = id => state.products.find(p => p.id === id) || null;

  const getMovements = () =>
    [...state.movements].sort((a, b) => new Date(b.date) - new Date(a.date) || (a.id < b.id ? 1 : -1));

  const getMovementsOf = productId =>
    state.movements.filter(m => m.productId === productId);

  function getCategories() {
    const base = ['Electrónica', 'Oficina', 'Limpieza', 'Herramientas', 'Otros'];
    const found = new Set(state.products.map(p => p.category).filter(Boolean));
    base.forEach(c => found.add(c));
    return [...found].sort((a, b) => a.localeCompare(b, 'es'));
  }

  const stockStatus = p => (p.quantity === 0 ? 'out' : p.quantity <= p.minStock ? 'low' : 'ok');

  function stats() {
    const products = state.products;
    return {
      skus: products.length,
      units: products.reduce((s, p) => s + p.quantity, 0),
      value: products.reduce((s, p) => s + p.quantity * p.price, 0),
      low: products.filter(p => stockStatus(p) === 'low').length,
      out: products.filter(p => stockStatus(p) === 'out').length,
      categories: new Set(products.map(p => p.category)).size,
      movements: state.movements.length,
    };
  }

  /* ================= Validación de productos ================= */

  function validateProduct(data, currentId = null) {
    const errors = {};
    const sku = String(data.sku || '').trim();
    const name = String(data.name || '').trim();

    if (!sku) {
      errors.sku = 'El SKU es obligatorio.';
    } else if (state.products.some(p => p.id !== currentId && p.sku.toLowerCase() === sku.toLowerCase())) {
      errors.sku = 'Ya existe un producto con ese SKU.';
    }

    if (!name) errors.name = 'El nombre es obligatorio.';

    const quantity = Number(data.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      errors.quantity = 'La cantidad debe ser un número entero mayor o igual a 0.';
    }

    const minStock = Number(data.minStock);
    if (!Number.isInteger(minStock) || minStock < 0) {
      errors.minStock = 'El stock mínimo debe ser un número entero mayor o igual a 0.';
    }

    const price = Number(data.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.price = 'El precio debe ser un número mayor o igual a 0.';
    }

    return errors;
  }

  /* ================= Escritura de productos ================= */

  function addProduct(data) {
    const errors = validateProduct(data);
    if (Object.keys(errors).length) return { ok: false, errors };

    const now = new Date().toISOString();
    const product = {
      id: uid(),
      sku: String(data.sku).trim(),
      name: String(data.name).trim(),
      category: (String(data.category || '').trim() || 'Otros'),
      description: String(data.description || '').trim(),
      quantity: Number(data.quantity),
      minStock: Number(data.minStock),
      price: Number(data.price),
      createdAt: now,
      updatedAt: now,
    };

    state.products.push(product);
    if (product.quantity > 0) {
      state.movements.push(makeMovement(product, 'entrada', product.quantity, 0, product.quantity, now, 'Stock inicial'));
    }
    persist();
    return { ok: true, product };
  }

  function updateProduct(id, data) {
    const product = getProduct(id);
    if (!product) return { ok: false, errors: { global: 'El producto ya no existe.' } };

    const errors = validateProduct(data, id);
    if (Object.keys(errors).length) return { ok: false, errors };

    const now = new Date().toISOString();
    const prevQuantity = product.quantity;
    const newQuantity = Number(data.quantity);

    // Si cambió la cantidad, se registra un movimiento de ajuste para no romper el historial
    if (newQuantity !== prevQuantity) {
      state.movements.push(
        makeMovement(product, 'ajuste', newQuantity, prevQuantity, newQuantity, now, 'Ajuste manual al editar el producto')
      );
      product.quantity = newQuantity;
    }

    product.sku = String(data.sku).trim();
    product.name = String(data.name).trim();
    product.category = (String(data.category || '').trim() || 'Otros');
    product.description = String(data.description || '').trim();
    product.minStock = Number(data.minStock);
    product.price = Number(data.price);
    product.updatedAt = now;

    persist();
    return { ok: true, product };
  }

  function deleteProduct(id) {
    const index = state.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    const [removed] = state.products.splice(index, 1);
    // El historial de movimientos se conserva con el nombre del producto como respaldo
    persist();
    return removed;
  }

  /* ================= Movimientos ================= */

  function registerMovement({ productId, type, quantity, note, date }) {
    const errors = {};
    const product = getProduct(productId);

    if (!product) errors.productId = 'Selecciona un producto válido.';
    if (!['entrada', 'salida', 'ajuste'].includes(type)) errors.type = 'Tipo de movimiento no válido.';

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      errors.quantity = 'La cantidad debe ser un número entero mayor o igual a 0.';
    } else if (type === 'entrada' && qty === 0) {
      errors.quantity = 'La entrada debe ser mayor que 0.';
    } else if (type === 'salida' && qty === 0) {
      errors.quantity = 'La salida debe ser mayor que 0.';
    } else if (type === 'salida' && product && qty > product.quantity) {
      errors.quantity = `Stock insuficiente: solo hay ${product.quantity} unidad(es) de “${product.name}”.`;
    }

    if (Object.keys(errors).length) return { ok: false, errors };

    const previous = product.quantity;
    let next;
    if (type === 'entrada') next = previous + qty;
    else if (type === 'salida') next = previous - qty;
    else next = qty; // ajuste: la cantidad indicada es la nueva existencia real

    product.quantity = next;
    product.updatedAt = new Date().toISOString();

    const movement = makeMovement(
      product,
      type,
      type === 'ajuste' ? qty : qty,
      previous,
      next,
      date ? new Date(date).toISOString() : new Date().toISOString(),
      String(note || '').trim()
    );
    state.movements.push(movement);
    persist();
    return { ok: true, product, movement };
  }

  /* ================= Datos: exportar / importar / restablecer ================= */

  function exportJSON() {
    const payload = {
      app: 'Sistema de Inventario',
      version: 1,
      exportedAt: new Date().toISOString(),
      products: state.products,
      movements: state.movements,
    };
    UI.download(`inventario-respaldo-${UI.todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    UI.toast('Respaldo JSON descargado.');
  }

  function exportCSV() {
    const head = ['SKU', 'Producto', 'Categoría', 'Cantidad', 'Stock mínimo', 'Precio', 'Valor total', 'Estado', 'Actualizado'];
    const statusLabel = { ok: 'OK', low: 'Stock bajo', out: 'Agotado' };
    const rows = state.products
      .slice()
      .sort((a, b) => a.sku.localeCompare(b.sku))
      .map(p => [
        p.sku, p.name, p.category, p.quantity, p.minStock,
        p.price.toFixed(2), (p.quantity * p.price).toFixed(2),
        statusLabel[stockStatus(p)], p.updatedAt,
      ]);
    const csv = '\uFEFF' + [head, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    UI.download(`inventario-${UI.todayISO()}.csv`, csv, 'text/csv;charset=utf-8');
    UI.toast('Archivo CSV descargado.');
  }

  function importJSON(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ok: false, message: 'El archivo no es un JSON válido.' };
    }
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.movements)) {
      return { ok: false, message: 'El archivo no tiene el formato de un respaldo válido.' };
    }
    state = normalize(parsed);
    persist();
    return { ok: true, count: state.products.length };
  }

  function resetSeed() {
    state = seed();
    persist();
  }

  function clearAll() {
    state = { version: 1, products: [], movements: [] };
    persist();
  }

  /* ================= Init ================= */

  function init() {
    state = load();
  }

  return {
    init,
    getProducts, getProduct, getMovements, getMovementsOf, getCategories,
    stockStatus, stats,
    addProduct, updateProduct, deleteProduct, registerMovement,
    exportJSON, exportCSV, importJSON, resetSeed, clearAll,
  };
})();
