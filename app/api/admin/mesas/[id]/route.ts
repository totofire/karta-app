import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

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
  const localId = await getLocalId(request);
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();

  try {
    // Verificar que la mesa sea mía
    const mesaExistente = await prisma.mesa.findFirst({
        where: { id: Number(id), localId } 
    });
    if (!mesaExistente) return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });

    // Si estamos cambiando el nombre O activando la mesa, chequeamos duplicados
    if (body.nombre || body.activo === true) {
      const conflicto = await prisma.mesa.findFirst({
        where: {
          nombre: body.nombre || mesaExistente.nombre,
          activo: true,
          localId, // Buscar solo en mi local
          NOT: { id: Number(id) } 
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
        activo: body.activo,
        sector: body.sector 
        // qr_token no se toca
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
  const localId = await getLocalId(request);
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    // Baja Lógica segura
    const count = await prisma.mesa.updateMany({
      where: { id: Number(id), localId }, // Solo si es mía
      data: { activo: false } 
    });
    
    if (count.count === 0) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al dar de baja la mesa." }, 
      { status: 500 }
    );
  }
}