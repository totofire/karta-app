import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const actualizada = await prisma.categoria.update({
    where: { id: Number(id) },
    data: {
      nombre: body.nombre,
      orden: Number(body.orden)
    }
  });
  return NextResponse.json(actualizada);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.categoria.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Si falla es probable que tenga productos asociados
    return NextResponse.json(
      { error: "No se puede borrar: La categoría tiene productos." }, 
      { status: 400 }
    );
  }
}