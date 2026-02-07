import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// --- HELPER DE SEGURIDAD ---
async function getLocalId(req: Request): Promise<number | null> {
  const tokenCookie = req.headers.get("cookie")?.split("; ").find(c => c.startsWith("token="));
  if (!tokenCookie) return null;
  const token = tokenCookie.split("=")[1];
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    return payload.localId as number;
  } catch {
    return null;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedidoId = Number(id);

  // 1. Verificar Autenticación
  const localId = await getLocalId(request);
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