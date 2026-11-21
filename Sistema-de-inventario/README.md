# Sistema de Inventario

Aplicación web para controlar el inventario de productos: altas, ediciones, bajas,
entradas y salidas de stock, con alertas de stock mínimo, reportes y exportación de datos.
No requiere servidor ni instalación: los datos se guardan en el navegador (localStorage).

## Cómo usarlo

Abre el archivo **`index.html`** con cualquier navegador moderno (doble clic es suficiente).

> Al primer arranque se cargan 8 productos de ejemplo con su historial de movimientos.
> Puedes eliminarlos o vaciar el inventario desde **Reportes → Gestión de datos**.

## Funcionalidades

**Productos**
- Alta, edición y eliminación de productos (SKU único, nombre, categoría, precio, cantidad, stock mínimo y descripción).
- Búsqueda por nombre, SKU o categoría.
- Filtros por categoría y por estado: *Stock OK*, *Stock bajo*, *Agotado* o *Requieren atención*.
- Alertas: banner de reabastecimiento y contador en el menú lateral.
- Acciones rápidas de entrada/salida desde la propia tabla.

**Movimientos**
- Entradas (suman existencia), salidas (la restan, nunca por debajo de 0) y ajustes (fijan el conteo real).
- Historial completo con fecha, producto, tipo, cantidad, stock resultante y nota.
- Filtros por producto, texto libre y tipo de movimiento.
- Si al editar un producto cambia su cantidad, se registra automáticamente un *ajuste* para no romper el historial.

**Reportes**
- KPIs: productos registrados, unidades en stock, valor del inventario y alertas de stock.
- Valor del inventario por categoría (con porcentaje).
- Top 5 de productos por valor.
- Lista de reabastecimiento sugerido, con botón para copiarla al portapapeles.
- Gestión de datos: exportar CSV, exportar/importar respaldo JSON, restaurar datos de ejemplo y vaciar inventario.

## Estructura del proyecto

```
index.html        Interfaz (vistas, modal y toasts)
css/styles.css    Estilos y diseño responsivo
js/ui.js          Utilidades: iconos, formato de moneda/fechas, toasts, modales
js/store.js       Capa de datos: localStorage, validaciones, movimientos, export/import
js/movements.js   Vista de movimientos (formulario + historial + modal rápido)
js/inventory.js   Vista de productos (CRUD, filtros, alertas)
js/reports.js     Vista de reportes (KPIs, categorías, reabastecimiento)
js/app.js         Arranque, navegación y acciones globales
```

## Notas técnicas

- Sin dependencias ni build: HTML, CSS y JavaScript puros. Funciona con doble clic en `index.html`.
- La moneda se cambia en `js/ui.js` (constante `CURRENCY`, por defecto `MXN`).
- Los datos viven en el almacenamiento local del navegador bajo la clave `sistema-inventario.v1`.
  Usa **Exportar respaldo (JSON)** antes de limpiar los datos del navegador o cambiar de equipo.
- El historial de movimientos se conserva aunque se elimine un producto.
- Navegación con URLs con `#productos`, `#movimientos` y `#reportes`.
