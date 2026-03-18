import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MINUTOS_CANCELACION = 3;

export async function POST(req: Request) {
  try {
    const { tokenEfimero, pedidoId, itemIds } = await req.json();

    if (!tokenEfimero || !pedidoId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Validar sesión activa
    const sesion = await prisma.sesion.findUnique({
      where: { tokenEfimero },
    });

    if (!sesion || sesion.fechaFin) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
    }

    // 2. Buscar pedido que pertenezca a esta sesión y siga PENDIENTE
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: Number(pedidoId),
        sesionId: sesion.id,
        estado: "PENDIENTE",
      },
      include: {
        items: { select: { id: true, estado: true } },
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Tu pedido ya está siendo preparado" },
        { status: 409 }
      );
    }

    // 3. Validar ventana de tiempo
    const minutosTranscurridos =
      (Date.now() - new Date(pedido.fecha).getTime()) / 60000;

    if (minutosTranscurridos > MINUTOS_CANCELACION) {
      return NextResponse.json(
        { error: "Se pasó el tiempo para cancelar. Pedile al mozo si necesitás ayuda." },
        { status: 410 }
      );
    }

    // 4. Determinar qué cancelar
    const itemsVivos = pedido.items.filter((i) => i.estado !== "CANCELADO");
    const idsACancelar: number[] =
      Array.isArray(itemIds) && itemIds.length > 0
        ? itemIds.map(Number).filter((id: number) => itemsVivos.some((i) => i.id === id))
        : itemsVivos.map((i) => i.id);

    if (idsACancelar.length === 0) {
      return NextResponse.json({ error: "No hay ítems válidos para cancelar" }, { status: 400 });
    }

    // 5. ¿Se cancelan TODOS los ítems vivos? → cancelar pedido completo
    const cancelaTodo = idsACancelar.length >= itemsVivos.length;

    if (cancelaTodo) {
      // Cancelación total: pedido pasa a CANCELADO
      await prisma.$transaction([
        prisma.itemPedido.updateMany({
          where: { id: { in: idsACancelar } },
          data: { estado: "CANCELADO" },
        }),
        prisma.pedido.update({
          where: { id: pedido.id },
          data: { estado: "CANCELADO" },
        }),
      ]);
    } else {
      // Cancelación parcial: solo ítems + toca el pedido para triggear Realtime
      // Ponemos impreso: false porque la comanda impresa ya no es válida
      await prisma.$transaction([
        prisma.itemPedido.updateMany({
          where: { id: { in: idsACancelar } },
          data: { estado: "CANCELADO" },
        }),
        prisma.pedido.update({
          where: { id: pedido.id },
          data: { impreso: false },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      cancelados: idsACancelar.length,
      pedidoCancelado: cancelaTodo,
    });
  } catch (error) {
    console.error("Error cancelando pedido (cliente):", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}