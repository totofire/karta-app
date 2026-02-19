import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const mode  = searchParams.get("mode") || "list";
  const page  = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 10;
  const skip  = (page - 1) * limit;

  const now   = new Date();
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
  const year  = parseInt(searchParams.get("year")  || String(now.getFullYear()));
  const day   = searchParams.get("day") ? parseInt(searchParams.get("day")!) : null;

  // Rango de fechas
  const startDate = day
    ? new Date(year, month - 1, day,  0,  0,  0)
    : new Date(year, month - 1,   1,  0,  0,  0);
  const endDate   = day
    ? new Date(year, month - 1, day, 23, 59, 59)
    : new Date(year, month,       0, 23, 59, 59);

  const whereBase = {
    localId,
    fechaFin: { gte: startDate, lte: endDate },
  };

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // MODO 1 · CALENDAR STATS
    // Antes: traía todos los registros a Node y los agrupaba en JS.
    // Ahora: query de agregación directa en Postgres — mucho más liviana.
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === "calendar_stats") {
      // groupBy no permite agrupar por parte de una fecha en Prisma,
      // así que usamos queryRaw que es una sola round-trip al servidor.
      const rows = await prisma.$queryRaw<{ dia: number; total: number }[]>`
        SELECT
          EXTRACT(DAY FROM "fechaFin")::int AS dia,
          SUM("totalVenta")::int            AS total
        FROM "Sesion"
        WHERE
          "localId" = ${localId}
          AND "fechaFin" >= ${startDate}
          AND "fechaFin" <= ${endDate}
        GROUP BY dia
        ORDER BY dia
      `;

      const dailyStats: Record<number, number> = {};
      let totalMes = 0;
      for (const r of rows) {
        dailyStats[r.dia] = r.total;
        totalMes += r.total;
      }

      return NextResponse.json({ dailyStats, totalMes });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODO 2 · LIST
    // Antes: include profundo (sesion → pedidos → items → producto) en cada fila.
    // Ahora:
    //   · La tabla solo necesita: fechaFin, mesa.nombre, cantidad de pedidos, total.
    //   · El detalle del modal se carga on-demand con una segunda query liviana.
    // Separamos en dos sub-modos: "list" (tabla) y "detalle" (modal).
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === "list") {
      // Corremos count y datos en paralelo
      const [sesiones, totalRegistros] = await Promise.all([
        prisma.sesion.findMany({
          where:   whereBase,
          orderBy: { fechaFin: "desc" },
          take:    limit,
          skip,
          // Solo los campos que necesita la tabla → sin items, sin productos
          select: {
            id:         true,
            fechaFin:   true,
            totalVenta: true,
            mesa: { select: { nombre: true } },
            // Solo contamos pedidos, no los traemos completos
            _count: { select: { pedidos: true } },
          },
        }),
        prisma.sesion.count({ where: whereBase }),
      ]);

      // Normalizamos para que el frontend reciba la misma forma que antes
      const data = sesiones.map((s) => ({
        id:          s.id,
        fechaFin:    s.fechaFin,
        totalVenta:  s.totalVenta,
        mesa:        s.mesa,
        pedidoCount: s._count.pedidos,   // número plano, no array
        pedidos:     [] as any[],        // vacío: se llena con mode=detalle
      }));

      return NextResponse.json({
        data,
        meta: { page, totalPages: Math.ceil(totalRegistros / limit), totalRegistros },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODO 3 · DETALLE (nuevo — para el modal)
    // Solo se llama cuando el usuario abre el ojo de una fila.
    // Carga los items de una sola sesión, mucho más específico y rápido.
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === "detalle") {
      const sesionId = searchParams.get("sesionId");
      if (!sesionId) return NextResponse.json({ error: "Falta sesionId" }, { status: 400 });

      const sesion = await prisma.sesion.findFirst({
        where: { id: Number(sesionId), localId }, // valida que sea de este local
        select: {
          id:         true,
          fechaFin:   true,
          totalVenta: true,
          mesa: { select: { nombre: true } },
          pedidos: {
            select: {
              estado: true,
              items: {
                select: {
                  cantidad: true,
                  precio:   true,
                  producto: { select: { nombre: true } },
                },
              },
            },
          },
        },
      });

      if (!sesion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

      return NextResponse.json(sesion);
    }

    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });

  } catch (error) {
    console.error("Error historial:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}