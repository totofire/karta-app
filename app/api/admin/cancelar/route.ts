import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

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
        // motivo: motivo (si agregas el campo a la BD)
      },
    });

    return NextResponse.json(pedido);
  } catch (error) {
    return NextResponse.json({ error: "Error cancelando" }, { status: 500 });
  }
}