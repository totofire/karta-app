import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const sesionesCerradas = await prisma.sesion.findMany({
      where: {
        fechaFin: { not: null },
        localId: localId // <--- FILTRO DE SEGURIDAD
      },
      include: {
        mesa: true,
        pedidos: {
          include: { items: true }
        }
      },
      orderBy: {
        fechaFin: 'desc'
      }
    });

    return NextResponse.json(sesionesCerradas);
  } catch (error) {
    return NextResponse.json({ error: "Error al traer historial" }, { status: 500 });
  }
}