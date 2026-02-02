import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sesionesCerradas = await prisma.sesion.findMany({
      where: {
        fechaFin: { not: null } // Solo las cobradas
      },
      include: {
        mesa: true, // Para saber qué mesa fue
        pedidos: {
          include: { items: true } // Por si querés ver el detalle después
        }
      },
      orderBy: {
        fechaFin: 'desc' // Lo más nuevo arriba
      }
    });

    return NextResponse.json(sesionesCerradas);
  } catch (error) {
    return NextResponse.json({ error: "Error al traer historial" }, { status: 500 });
  }
}