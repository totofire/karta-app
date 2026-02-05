import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    // Creamos un objeto dinámico SOLO con lo que vamos a cambiar
    const datosAActualizar: any = {};

    // Solo si mandaron nombre, lo agregamos
    if (body.nombre) datosAActualizar.nombre = body.nombre;
    
    // Solo si mandaron precio, lo convertimos y agregamos
    if (body.precio !== undefined && body.precio !== "") {
        datosAActualizar.precio = Number(body.precio);
    }

    // Solo si mandaron activo (true/false), lo agregamos
    if (body.activo !== undefined) {
        datosAActualizar.activo = body.activo;
    }

    // Solo si mandaron descripción
    if (body.descripcion !== undefined) {
        datosAActualizar.descripcion = body.descripcion;
    }

    // Solo si mandaron categoría
    if (body.categoriaId) {
        datosAActualizar.categoriaId = Number(body.categoriaId);
    }

    // ✅ Solo si mandaron imagen, la agregamos
    if (body.imagen !== undefined) {
        datosAActualizar.imagen = body.imagen;
    }

    // Actualizamos solo esos campos
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
  try {
    await prisma.producto.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 });
  }
}