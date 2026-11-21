/* ============================================================
   ReportsView — KPIs, valor por categoría, top productos,
   reabastecimiento sugerido y copia de la lista de compra
   ============================================================ */

window.ReportsView = (() => {
  const reorderQty = p => Math.max(p.minStock * 2 - p.quantity, 1);

  function kpi(iconName, tone, value, label) {
    return `
      <div class="kpi">
        <div class="kpi-icon ${tone}">${UI.icon(iconName, 20)}</div>
        <div>
          <div class="kpi-value">${value}</div>
          <div class="kpi-label">${label}</div>
        </div>
      </div>`;
  }

  function render() {
    const products = Store.getProducts();
    const s = Store.stats();

    /* ----- KPIs ----- */
    document.getElementById('kpi-grid').innerHTML =
      kpi('box', 'blue', UI.int(s.skus), 'Productos registrados') +
      kpi('layers', 'green', UI.int(s.units), 'Unidades en stock') +
      kpi('dollar', 'purple', UI.money(s.value), 'Valor del inventario') +
      kpi('alert', 'red', UI.int(s.low + s.out), 'Alertas de stock');

    /* ----- Valor por categoría ----- */
    const byCategory = {};
    products.forEach(p => {
      const c = byCategory[p.category] || (byCategory[p.category] = { skus: 0, units: 0, value: 0 });
      c.skus++;
      c.units += p.quantity;
      c.value += p.quantity * p.price;
    });
    const totalValue = s.value || 1;
    const catRows = Object.entries(byCategory)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([name, c]) => {
        const pct = (c.value / totalValue) * 100;
        return `
          <tr>
            <td class="cell-title">${UI.esc(name)}</td>
            <td class="right num">${UI.int(c.skus)}</td>
            <td class="right num">${UI.int(c.units)}</td>
            <td class="right num strong">${UI.money(c.value)}</td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div class="bar-track" style="flex:1;"><div class="bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
                <span class="muted small num" style="width:42px; text-align:right;">${pct.toFixed(0)}%</span>
              </div>
            </td>
          </tr>`;
      }).join('');
    document.getElementById('category-body').innerHTML =
      catRows || '<tr><td colspan="5" class="muted" style="text-align:center; padding:24px;">Sin datos que mostrar.</td></tr>';

    /* ----- Top 5 por valor ----- */
    const top = products
      .filter(p => p.quantity > 0)
      .sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price))
      .slice(0, 5);
    document.getElementById('top-products').innerHTML = top.length
      ? top.map((p, i) => `
          <div class="top-row">
            <div class="top-rank">${i + 1}</div>
            <div class="top-info">
              <div class="top-name">${UI.esc(p.name)}</div>
              <div class="muted small">${UI.int(p.quantity)} u. × ${UI.money(p.price)}</div>
            </div>
            <div class="top-value">${UI.money(p.quantity * p.price)}</div>
          </div>`).join('')
      : '<p class="muted" style="padding:10px 0;">No hay productos con existencias.</p>';

    /* ----- Reabastecimiento ----- */
    const low = products
      .filter(p => Store.stockStatus(p) !== 'ok')
      .sort((a, b) => a.quantity - b.quantity);
    document.getElementById('reorder-list').innerHTML = low.length
      ? low.map(p => `
          <div class="reorder-row">
            <span class="badge ${Store.stockStatus(p) === 'out' ? 'badge-out' : 'badge-low'}">
              ${Store.stockStatus(p) === 'out' ? 'Agotado' : 'Stock bajo'}
            </span>
            <div class="reorder-info">
              <div class="reorder-name">${UI.esc(p.name)}</div>
              <div class="reorder-sub">Stock ${UI.int(p.quantity)} · mínimo ${UI.int(p.minStock)} · sugerido: ${UI.int(reorderQty(p))} u.</div>
            </div>
          </div>`).join('')
      : '<p class="muted" style="padding:10px 0;">✓ Todos los productos están por encima del stock mínimo.</p>';
  }

  async function copyShoppingList() {
    const low = Store.getProducts()
      .filter(p => Store.stockStatus(p) !== 'ok')
      .sort((a, b) => a.quantity - b.quantity);
    if (!low.length) { UI.toast('No hay productos que necesiten reabastecimiento.', 'warn'); return; }

    const lines = low.map(p =>
      `• ${p.name} (${p.sku}): ${p.quantity} u. en stock, mínimo ${p.minStock}. Sugerir ${reorderQty(p)} u.`
    );
    const text = `Lista de reabastecimiento — ${new Date().toLocaleDateString('es-MX')}\n` + lines.join('\n');
    const ok = await UI.copyText(text);
    UI.toast(ok ? 'Lista de reabastecimiento copiada al portapapeles.' : 'No se pudo copiar la lista.', ok ? 'success' : 'error');
  }

  return { init() {}, render, copyShoppingList };
})();
