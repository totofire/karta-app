import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import { broadcastPedido } from "@/lib/broadcast";

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { pedidoId, motivo } = await req.json();

    // 1. Verificación de seguridad: ¿El pedido es de mi local?
    const verificarPedido = await prisma.pedido.findFirst({
      where: { 
        id: pedidoId,
        localId: localId // <--- CANDADO DE SEGURIDAD
      }
    });

    if (!verificarPedido) {
      return NextResponse.json({ error: "Pedido no encontrado o no tienes permiso" }, { status: 404 });
    }

    // 2. Actualizar
    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado: "CANCELADO",
      },
      include: { sesion: { select: { id: true } } },
    });

    await broadcastPedido(localId, "update", { pedidoId, estado: "CANCELADO" });
    if (pedido.sesion) {
      const { broadcastCliente } = await import("@/lib/broadcast");
      await broadcastCliente(pedido.sesion.id, "update", { pedidoId, estado: "CANCELADO" });
    }

    return NextResponse.json(pedido);
  } catch (error) {
    return NextResponse.json({ error: "Error cancelando" }, { status: 500 });
  }
}