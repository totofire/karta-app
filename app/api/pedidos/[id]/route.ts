import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

// PATCH: Para actualizar solo el estado
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Recordá el cambio de Next 16
) {
  const { id } = await params;
  const { estado } = await request.json(); // Esperamos { estado: "ENTREGADO" }

  try {
    const pedidoActualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { estado },
    });
    return NextResponse.json(pedidoActualizado);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}