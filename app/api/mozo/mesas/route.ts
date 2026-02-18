import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const mesas = await prisma.mesa.findMany({
      where: { localId, activo: true },
      include: {
        sesiones: {
          where: { fechaFin: null },
          include: {
            pedidos: {
              where: { estado: { not: "CANCELADO" } },
              include: { items: true }
            }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    const mesasConEstado = mesas.map(m => {
      const sesion = m.sesiones[0];
      
      let totalActual = 0;
      if (sesion) {
        sesion.pedidos.forEach(p => {
          p.items.forEach(item => {
            totalActual += item.precio * item.cantidad;
          });
        });
      }

      return {
        id: m.id,
        nombre: m.nombre,
        sector: m.sector,
        ocupada: m.sesiones.length > 0,
        totalActual,
        horaInicio: sesion?.fechaInicio ?? null,
      };
    });

    return NextResponse.json(mesasConEstado);
  } catch (error) {
    return NextResponse.json({ error: "Error cargando mesas" }, { status: 500 });
  }
}