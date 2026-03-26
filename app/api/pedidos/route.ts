import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerReglasActivas, aplicarReglasAItems } from "@/lib/descuentos";

interface ProductoRequest {
  productoId: number;
  cantidad: number;
  observaciones?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tokenEfimero, nombreCliente, productos } = body;

    // 1. VALIDACIÓN BÁSICA
    if (!tokenEfimero || !productos || productos.length === 0) {
      return NextResponse.json({ error: "Faltan datos del pedido" }, { status: 400 });
    }

    // 2. BUSCAR SESIÓN (y traemos la mesa para saber de qué LOCAL es)
    const sesion = await prisma.sesion.findUnique({
      where: { tokenEfimero },
      include: { mesa: true }
    });

    // 3. VALIDACIONES DE SEGURIDAD
    if (!sesion) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
    }
    if (sesion.fechaFin) {
      return NextResponse.json({ error: "Mesa cerrada. Escaneá QR nuevo." }, { status: 410 });
    }
    if (sesion.expiraEn && sesion.expiraEn < new Date()) {
      return NextResponse.json({ error: "Sesión expirada. Escaneá QR nuevo." }, { status: 410 });
    }

    // 🔥 DATO CLAVE: El localId viene de la mesa, no de una cookie de usuario
    const localIdDelBar = sesion.mesa.localId;

    // 4. BUSCAR PRECIOS REALES (Asegurando que sean productos de ESTE local)
    const idsProductos = productos.map((p: ProductoRequest) => p.productoId);

    const [productosDb, configuracion, reglasActivas] = await Promise.all([
      prisma.producto.findMany({
        where: {
          id: { in: idsProductos },
          localId: localIdDelBar,
        },
      }),
      prisma.configuracion.findUnique({
        where: { localId: localIdDelBar },
        select: { usaStock: true },
      }),
      obtenerReglasActivas(localIdDelBar),
    ]);

    // 5. ARMAR ITEMS
    const itemsBase = productos.map((prodFront: ProductoRequest) => {
      const infoReal = productosDb.find((p: any) => p.id === prodFront.productoId);
      if (!infoReal) return null;

      return {
        productoId: prodFront.productoId,
        cantidad: prodFront.cantidad,
        precio: infoReal.precio,
        observaciones: prodFront.observaciones || "",
        categoriaId: infoReal.categoriaId,
      };
    }).filter((item: any) => item !== null);

    if (itemsBase.length === 0) {
      return NextResponse.json({ error: "Productos no válidos para este local" }, { status: 400 });
    }

    // Aplicar reglas de descuento item-level (2X1, PRECIO_ESPECIAL, PORCENTAJE por item)
    const itemsConDescuento = aplicarReglasAItems(itemsBase, reglasActivas);

    // Separar categoriaId (campo interno, no va a la BD de ItemPedido)
    const itemsParaGuardar = itemsConDescuento.map(({ categoriaId: _cat, ...item }) => item);

    // 🔥 ASIGNACIÓN AUTOMÁTICA DE NOMBRE SI ES NULL
    // Si no viene nombre, usamos el nombre de la mesa (Ej: "Mesa 4")
    const nombreFinal = nombreCliente && nombreCliente.trim() !== "" 
        ? nombreCliente 
        : `Mesa ${sesion.mesa.nombre}`;

    // 6. GUARDAR PEDIDO + DECREMENTAR STOCK (en transacción)
    const operacionesStock = configuracion?.usaStock
      ? itemsParaGuardar
          .filter((item: any) => {
            const prod = productosDb.find((p: any) => p.id === item.productoId);
            return prod && prod.stockActual !== null;
          })
          .map((item: any) =>
            prisma.producto.update({
              where: { id: item.productoId },
              data: { stockActual: { decrement: item.cantidad } },
            })
          )
      : [];

    const [nuevoPedido] = await prisma.$transaction([
      prisma.pedido.create({
        data: {
          sesionId: sesion.id,
          localId: localIdDelBar,
          nombreCliente: nombreFinal,
          estado: "PENDIENTE",
          items: { create: itemsParaGuardar },
        },
        include: { items: { include: { producto: true } } },
      }),
      ...operacionesStock,
    ]);

    return NextResponse.json({ success: true, pedidoId: nuevoPedido.id });

  } catch (error) {
    console.error("Error al procesar pedido:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}