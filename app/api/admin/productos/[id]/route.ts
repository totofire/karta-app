import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PATCH: Actualizar precio, nombre o estado (Activo/Inactivo)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Recordá: Next.js 16 pide Promise
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const productoActualizado = await prisma.producto.update({
      where: { id: Number(id) },
      data: {
        nombre: body.nombre,
        precio: Number(body.precio),
        activo: body.activo
      },
    });
    return NextResponse.json(productoActualizado);
  } catch (error) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

// DELETE: Borrar un producto (con cuidado)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.producto.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 });
  }
}