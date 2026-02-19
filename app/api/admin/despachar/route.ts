import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { pedidoId, sector } = await req.json(); // sector: 'cocina' | 'barra'

    if (!pedidoId || !sector) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const esCocina = sector === "cocina";

    // 1. Items PENDIENTES de este sector en este pedido (validando que sea de mi local)
    const itemsAActualizar = await prisma.itemPedido.findMany({
      where: {
        pedidoId: Number(pedidoId),
        estado:   "PENDIENTE",
        pedido:   { localId },
        producto: { categoria: { imprimirCocina: esCocina } },
      },
      select: { id: true },
    });

    if (itemsAActualizar.length > 0) {
      await prisma.itemPedido.updateMany({
        where: { id: { in: itemsAActualizar.map((i) => i.id) } },
        data:  { estado: "ENTREGADO" },
      });
    }

    // 2. ¿Quedan items PENDIENTES (de cualquier sector) en este pedido?
    const itemsPendientesTotal = await prisma.itemPedido.count({
      where: { pedidoId: Number(pedidoId), estado: "PENDIENTE" },
    });

    // 3. Actualizar estado del pedido padre
    if (itemsPendientesTotal === 0) {
      // Pedido 100% listo → guardamos el timestamp de despacho para analytics
      await prisma.pedido.update({
        where: { id: Number(pedidoId) },
        data: {
          estado:        "ENTREGADO",
          fechaDespacho: new Date(), // 🔥 tiempo real de espera del cliente
        },
      });
    } else {
      await prisma.pedido.update({
        where: { id: Number(pedidoId) },
        data:  { estado: "EN_PREPARACION" },
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error al despachar:", error);
    return NextResponse.json({ error: "Error despachando" }, { status: 500 });
  }
}