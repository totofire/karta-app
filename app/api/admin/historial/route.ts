import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  
  const mode = searchParams.get("mode") || "list"; // 'list' o 'calendar_stats'
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const skip = (page - 1) * limit;

  // Fechas
  const now = new Date();
  const month = parseInt(searchParams.get("month") || (now.getMonth() + 1).toString());
  const year = parseInt(searchParams.get("year") || now.getFullYear().toString());
  const day = searchParams.get("day") ? parseInt(searchParams.get("day")!) : null;

  // Rango de fechas
  let startDate, endDate;

  if (day) {
    // Si piden un día específico
    startDate = new Date(year, month - 1, day, 0, 0, 0);
    endDate = new Date(year, month - 1, day, 23, 59, 59);
  } else {
    // Si es todo el mes
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59);
  }

  try {
    // --- MODO 1: ESTADÍSTICAS PARA EL CALENDARIO (Solo totales por día) ---
    if (mode === 'calendar_stats') {
      // Traemos fecha y total de todas las ventas del mes (liviano)
      const ventasRaw = await prisma.sesion.findMany({
        where: {
          localId,
          fechaFin: { gte: startDate, lte: endDate }
        },
        select: {
          fechaFin: true,
          totalVenta: true
        }
      });

      // Agrupamos en JS (Prisma no tiene group by date nativo fácil)
      const diasMap: Record<number, number> = {};
      let totalMes = 0;

      ventasRaw.forEach(v => {
        if (!v.fechaFin) return;
        const dia = v.fechaFin.getDate();
        diasMap[dia] = (diasMap[dia] || 0) + v.totalVenta;
        totalMes += v.totalVenta;
      });

      return NextResponse.json({ dailyStats: diasMap, totalMes });
    }

    // --- MODO 2: LISTA DETALLADA (Paginada) ---
    const [sesiones, totalRegistros] = await Promise.all([
      prisma.sesion.findMany({
        where: {
          localId,
          fechaFin: { gte: startDate, lte: endDate }
        },
        include: {
          mesa: true,
          pedidos: {
            include: { items: { include: { producto: true } } }
          }
        },
        orderBy: { fechaFin: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.sesion.count({
        where: {
          localId,
          fechaFin: { gte: startDate, lte: endDate }
        }
      })
    ]);

    const totalPages = Math.ceil(totalRegistros / limit);

    return NextResponse.json({
      data: sesiones,
      meta: { page, totalPages, totalRegistros }
    });

  } catch (error) {
    console.error("Error historial:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}