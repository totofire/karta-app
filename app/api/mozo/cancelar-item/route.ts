import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId requerido" }, { status: 400 });

  // Verificar que el item pertenece a este local
  const item = await prisma.itemPedido.findFirst({
    where: { id: itemId, pedido: { localId } },
    include: {
      pedido: { include: { items: { select: { id: true, estado: true } } } },
    },
  });

  if (!item) return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  if (item.estado === "ENTREGADO") {
    return NextResponse.json({ error: "No se puede cancelar un ítem ya entregado" }, { status: 409 });
  }

  await prisma.itemPedido.update({
    where: { id: itemId },
    data: { estado: "CANCELADO" },
  });

  // Si todos los ítems del pedido quedan cancelados, cancelar el pedido también
  const otrosItems = item.pedido.items.filter((i) => i.id !== itemId);
  const todosCancelados = otrosItems.every((i) => i.estado === "CANCELADO");
  if (todosCancelados) {
    await prisma.pedido.update({
      where: { id: item.pedidoId },
      data: { estado: "CANCELADO" },
    });
  }

  return NextResponse.json({ ok: true });
}
