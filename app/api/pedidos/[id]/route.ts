import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedidoId = Number(id);

  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();

  try {
    // 2. Verificar que el pedido exista y PERTENEZCA AL LOCAL
    const pedidoExiste = await prisma.pedido.findFirst({
      where: { 
        id: pedidoId,
        localId: localId // <--- CANDADO DE SEGURIDAD CRÍTICO
      }
    });

    if (!pedidoExiste) {
      return NextResponse.json({ error: "Pedido no encontrado o no tienes permiso" }, { status: 404 });
    }

    // 3. Preparar los datos a actualizar dinámicamente
    const dataUpdate: any = {};
    
    if (body.estado) dataUpdate.estado = body.estado;
    if (body.impreso !== undefined) dataUpdate.impreso = body.impreso; 

    // 4. Ejecutar la actualización
    const pedidoActualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: dataUpdate,
    });
    
    return NextResponse.json(pedidoActualizado);

  } catch (error) {
    console.error("Error al actualizar pedido:", error);
    return NextResponse.json({ error: "Error interno al actualizar" }, { status: 500 });
  }
}