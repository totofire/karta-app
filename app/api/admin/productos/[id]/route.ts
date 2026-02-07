import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();

  try {
    // Verificar que el producto sea del local
    const existe = await prisma.producto.findFirst({
      where: { id: Number(id), localId }
    });
    if (!existe) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const datosAActualizar: any = {};

    if (body.nombre) datosAActualizar.nombre = body.nombre;
    
    if (body.precio !== undefined && body.precio !== "") {
        datosAActualizar.precio = Number(body.precio);
    }

    if (body.activo !== undefined) {
        datosAActualizar.activo = body.activo;
    }

    if (body.descripcion !== undefined) {
        datosAActualizar.descripcion = body.descripcion;
    }

    if (body.categoriaId) {
        datosAActualizar.categoriaId = Number(body.categoriaId);
    }

    if (body.imagen !== undefined) {
        datosAActualizar.imagen = body.imagen;
    }

    const productoActualizado = await prisma.producto.update({
      where: { id: Number(id) },
      data: datosAActualizar,
    });

    return NextResponse.json(productoActualizado);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
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
    const count = await prisma.producto.deleteMany({
      where: { id: Number(id), localId },
    });

    if (count.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 });
  }
}