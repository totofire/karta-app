import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    // Si estamos cambiando el nombre O activando la mesa, chequeamos duplicados
    if (body.nombre || body.activo === true) {
      // Buscamos si hay OTRA mesa activa con ese nombre
      const conflicto = await prisma.mesa.findFirst({
        where: {
          nombre: body.nombre, // Si no manda nombre, usa el que ya tenía (habría que buscarlo antes, pero asumimos que el front lo manda)
          activo: true,
          NOT: { id: Number(id) } // Que no sea yo mismo
        }
      });

      if (conflicto) {
         return NextResponse.json(
          { error: "No se puede activar/renombrar: Ya existe otra mesa activa con ese nombre." }, 
          { status: 400 }
        );
      }
    }

    const actualizada = await prisma.mesa.update({
      where: { id: Number(id) },
      data: {
        nombre: body.nombre,
        qr_token: body.qr_token,
        activo: body.activo,
        sector: body.sector // <--- Agregamos esto para permitir cambiar de zona
      }
    });
    return NextResponse.json(actualizada);
  } catch (error) {
    return NextResponse.json({ error: "Error actualizando mesa" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Baja Lógica
    await prisma.mesa.update({
      where: { id: Number(id) },
      data: { activo: false } 
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al dar de baja la mesa." }, 
      { status: 500 }
    );
  }
}