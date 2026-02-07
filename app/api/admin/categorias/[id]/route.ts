import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();

  try {
    // Verificamos que la categoría sea mía antes de editarla (usando updateMany o findFirst+update)
    // Prisma no deja hacer update con where compuesto si no es unique, así que primero validamos:
    const existe = await prisma.categoria.findFirst({
      where: { id: Number(id), localId }
    });

    if (!existe) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });

    const actualizada = await prisma.categoria.update({
      where: { id: Number(id) },
      data: {
        nombre: body.nombre,
        orden: Number(body.orden),
        imprimirCocina: body.imprimirCocina
      }
    });
    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    // Usamos deleteMany para poder filtrar por ID y localId a la vez de forma segura
    const info = await prisma.categoria.deleteMany({ 
      where: { 
        id: Number(id),
        localId: localId // <--- SOLO BORRA SI ES MIA
      } 
    });

    if (info.count === 0) {
      return NextResponse.json({ error: "No se pudo borrar" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al borrar. Verificá que no tenga productos." }, { status: 500 });
  }
}