import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Usamos el cliente optimizado

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    // 1. Creamos un objeto dinámico SOLO con lo que vamos a cambiar
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

    // 2. Actualizamos solo esos campos
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

// DELETE: Dejalo igual, funciona bien
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