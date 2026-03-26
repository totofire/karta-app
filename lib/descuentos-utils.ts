/**
 * Funciones puras de descuento — sin dependencias de servidor.
 * Importables desde componentes cliente.
 */

export interface ReglaActiva {
  id: number;
  nombre: string;
  tipo: string;  // "PORCENTAJE" | "2X1" | "PRECIO_ESPECIAL" | "DESCUENTO_GLOBAL"
  valor: number;
  categoriaId: number | null;
  productoId: number | null;
  diasSemana: string | null;
  horaDesde: string | null;
  horaHasta: string | null;
}

export interface ItemParaPedido {
  productoId: number;
  cantidad: number;
  precio: number;
  observaciones?: string;
  categoriaId?: number;
}

export interface ItemConDescuento extends ItemParaPedido {
  descuentoAplicado: number;
}

// ── Resultado de descuento para mostrar en el menú ───────────────────────────
export interface DescuentoDisplay {
  tipo: "PORCENTAJE" | "2X1" | "PRECIO_ESPECIAL" | "DESCUENTO_GLOBAL" | null;
  badge: string | null;          // "20% OFF", "2×1", "Precio especial"
  precioEfectivo: number;        // precio a mostrar (ya con descuento aplicado)
  precioOriginal: number | null; // precio tachado, null si no hay cambio de precio
}

// ─── Helpers temporales ───────────────────────────────────────────────────────

export function horaEnRango(
  horaDesde: string | null,
  horaHasta: string | null,
  ahora: Date
): boolean {
  if (!horaDesde || !horaHasta) return true;
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}:${String(
    ahora.getMinutes()
  ).padStart(2, "0")}`;
  return hhmm >= horaDesde && hhmm <= horaHasta;
}

export function diaEnRegla(diasSemana: string | null, ahora: Date): boolean {
  if (!diasSemana) return true;
  const diaJS = ahora.getDay();
  const diaNuestro = diaJS === 0 ? 7 : diaJS;
  return diasSemana.split(",").map(Number).includes(diaNuestro);
}

export function filtrarReglasVigentes(reglas: ReglaActiva[], ahora: Date): ReglaActiva[] {
  return reglas.filter(
    (r) => diaEnRegla(r.diasSemana, ahora) && horaEnRango(r.horaDesde, r.horaHasta, ahora)
  );
}

// ─── Calcular cómo mostrar el descuento de un producto en el menú ─────────────

export function descuentoParaProducto(
  productoId: number,
  categoriaId: number,
  precio: number,
  reglas: ReglaActiva[]
): DescuentoDisplay {
  // Buscar regla aplicable — prioridad: producto > categoría
  const regla =
    reglas.find((r) =>
      (r.tipo === "2X1" || r.tipo === "PRECIO_ESPECIAL" || r.tipo === "PORCENTAJE") &&
      r.productoId === productoId
    ) ??
    reglas.find((r) =>
      (r.tipo === "2X1" || r.tipo === "PRECIO_ESPECIAL" || r.tipo === "PORCENTAJE") &&
      r.categoriaId === categoriaId && r.productoId === null
    );

  if (!regla) {
    return { tipo: null, badge: null, precioEfectivo: precio, precioOriginal: null };
  }

  if (regla.tipo === "2X1") {
    return {
      tipo: "2X1",
      badge: "2×1",
      precioEfectivo: precio,    // precio unitario sin cambio — el ahorro aparece al agregar de a 2
      precioOriginal: null,
    };
  }

  if (regla.tipo === "PRECIO_ESPECIAL") {
    return {
      tipo: "PRECIO_ESPECIAL",
      badge: "Precio especial",
      precioEfectivo: regla.valor,
      precioOriginal: precio,
    };
  }

  if (regla.tipo === "PORCENTAJE") {
    const efectivo = precio * (1 - regla.valor / 100);
    return {
      tipo: "PORCENTAJE",
      badge: `${regla.valor}% OFF`,
      precioEfectivo: Math.round(efectivo),
      precioOriginal: precio,
    };
  }

  return { tipo: null, badge: null, precioEfectivo: precio, precioOriginal: null };
}

// ─── Reglas globales activas (DESCUENTO_GLOBAL o PORCENTAJE sin scope) ────────

export function reglasGlobalesActivas(reglas: ReglaActiva[]): ReglaActiva[] {
  return reglas.filter(
    (r) =>
      (r.tipo === "DESCUENTO_GLOBAL" || r.tipo === "PORCENTAJE") &&
      r.productoId === null &&
      r.categoriaId === null
  );
}

// ─── Aplicar reglas a ítems para calcular descuentoAplicado (usado en /api/pedidos) ─

export function aplicarReglasAItems(
  items: ItemParaPedido[],
  reglas: ReglaActiva[]
): ItemConDescuento[] {
  const reglasItem = reglas.filter(
    (r) =>
      r.tipo === "2X1" ||
      r.tipo === "PRECIO_ESPECIAL" ||
      (r.tipo === "PORCENTAJE" && (r.productoId !== null || r.categoriaId !== null))
  );

  return items.map((item) => {
    const regla =
      reglasItem.find((r) => r.productoId === item.productoId) ??
      reglasItem.find(
        (r) => r.categoriaId === item.categoriaId && r.productoId === null
      );

    if (!regla) return { ...item, descuentoAplicado: 0 };

    if (regla.tipo === "2X1") {
      const pagas = Math.ceil(item.cantidad / 2);
      const gratis = item.cantidad - pagas;
      return { ...item, descuentoAplicado: gratis * item.precio };
    }

    if (regla.tipo === "PRECIO_ESPECIAL") {
      const ahorro = (item.precio - regla.valor) * item.cantidad;
      return { ...item, descuentoAplicado: Math.max(0, ahorro) };
    }

    if (regla.tipo === "PORCENTAJE") {
      return {
        ...item,
        descuentoAplicado: (item.precio * item.cantidad * regla.valor) / 100,
      };
    }

    return { ...item, descuentoAplicado: 0 };
  });
}

// ─── Calcular descuento a nivel sesión (cierre de mesa) ───────────────────────

export function calcularDescuentoSesion(
  totalBruto: number,
  reglas: ReglaActiva[]
): number {
  const globales = reglasGlobalesActivas(reglas);
  let descuento = 0;

  for (const r of globales) {
    if (r.tipo === "DESCUENTO_GLOBAL") descuento = Math.max(descuento, r.valor);
    if (r.tipo === "PORCENTAJE")
      descuento = Math.max(descuento, (totalBruto * r.valor) / 100);
  }

  return Math.min(descuento, totalBruto);
}
