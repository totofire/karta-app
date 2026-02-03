import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    // Preparamos los datos a actualizar dinámicamente
    const dataUpdate: any = {};
    
    if (body.estado) dataUpdate.estado = body.estado;
    if (body.impreso !== undefined) dataUpdate.impreso = body.impreso; // <--- Manejamos el booleano

    const pedidoActualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: dataUpdate,
    });
    
    return NextResponse.json(pedidoActualizado);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}