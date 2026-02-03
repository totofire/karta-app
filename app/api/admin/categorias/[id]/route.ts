import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const actualizada = await prisma.categoria.update({
      where: { id: Number(id) },
      data: {
        nombre: body.nombre,
        orden: Number(body.orden),
        imprimirCocina: body.imprimirCocina // <--- Actualizamos esto
      }
    });
    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

// El DELETE dejalo como estaba
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.categoria.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}