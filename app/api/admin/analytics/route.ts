import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode  = searchParams.get("mode") || "ventas_periodo";
  const range = searchParams.get("range") || "7d"; // 7d | 4w | 12m

  try {

    // ─────────────────────────────────────────────────────────────────
    // MODO: VENTAS POR PERÍODO
    // Devuelve ventas agrupadas por día/semana/mes según el rango
    // ─────────────────────────────────────────────────────────────────
    if (mode === "ventas_periodo") {

      const ahora = new Date();
      let startDate: Date;
      let groupFormat: string;  // formato SQL para el truncamiento
      let labelFormat: string;  // para el frontend

      if (range === "7d") {
        startDate   = new Date(ahora);
        startDate.setDate(ahora.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        groupFormat = "day";
      } else if (range === "4w") {
        startDate   = new Date(ahora);
        startDate.setDate(ahora.getDate() - 27);
        startDate.setHours(0, 0, 0, 0);
        groupFormat = "day";   // aún por día pero 28 puntos
      } else {
        // 12m → un punto por mes
        startDate   = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);
        groupFormat = "month";
      }

      // Una sola query SQL de agregación — sin traer filas a Node
      const rows = await prisma.$queryRaw<
        { periodo: Date; total_ventas: number; cant_sesiones: bigint }[]
      >`
        SELECT
          DATE_TRUNC(${groupFormat}, "fechaFin") AS periodo,
          SUM("totalVenta")::float               AS total_ventas,
          COUNT(*)                               AS cant_sesiones
        FROM "Sesion"
        WHERE
          "localId" = ${localId}
          AND "fechaFin" IS NOT NULL
          AND "fechaFin" >= ${startDate}
          AND "fechaFin" <= ${ahora}
        GROUP BY periodo
        ORDER BY periodo ASC
      `;

      // ── Rellenamos los días/meses sin ventas con 0 ─────────────────
      const mapa = new Map<string, { total: number; sesiones: number }>();

      for (const r of rows) {
        const key = new Date(r.periodo).toISOString();
        mapa.set(key, {
          total:    r.total_ventas,
          sesiones: Number(r.cant_sesiones),
        });
      }

      // Generamos todas las fechas del rango para no tener huecos
      const data: {
        label: string;
        fecha: string;
        total: number;
        sesiones: number;
      }[] = [];

      const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

      if (groupFormat === "day") {
        // Iteramos cada día del rango
        const cursor = new Date(startDate);
        while (cursor <= ahora) {
          const key = new Date(
            Date.UTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())
          ).toISOString();

          // Buscamos en el mapa: la clave viene de DATE_TRUNC → medianoche UTC
          const match = [...mapa.entries()].find(([k]) => {
            const d = new Date(k);
            return (
              d.getUTCFullYear() === cursor.getFullYear() &&
              d.getUTCMonth()    === cursor.getMonth()    &&
              d.getUTCDate()     === cursor.getDate()
            );
          });

          const label =
            range === "7d"
              ? DIAS_ES[cursor.getDay()]                         // "Lun"
              : `${cursor.getDate()} ${MESES_ES[cursor.getMonth()]}`; // "14 Feb"

          data.push({
            label,
            fecha:    cursor.toISOString(),
            total:    match ? match[1].total    : 0,
            sesiones: match ? match[1].sesiones : 0,
          });

          cursor.setDate(cursor.getDate() + 1);
        }

      } else {
        // 12m → iteramos mes a mes
        const cursor = new Date(startDate);
        while (
          cursor.getFullYear() < ahora.getFullYear() ||
          (cursor.getFullYear() === ahora.getFullYear() &&
           cursor.getMonth()    <= ahora.getMonth())
        ) {
          const match = [...mapa.entries()].find(([k]) => {
            const d = new Date(k);
            return (
              d.getUTCFullYear() === cursor.getFullYear() &&
              d.getUTCMonth()    === cursor.getMonth()
            );
          });

          data.push({
            label:    `${MESES_ES[cursor.getMonth()]} ${cursor.getFullYear()}`,
            fecha:    cursor.toISOString(),
            total:    match ? match[1].total    : 0,
            sesiones: match ? match[1].sesiones : 0,
          });

          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      // ── Métricas de resumen ────────────────────────────────────────
      const totalPeriodo    = data.reduce((s, d) => s + d.total, 0);
      const totalSesiones   = data.reduce((s, d) => s + d.sesiones, 0);
      const ticketPromedio  = totalSesiones > 0
        ? Math.round(totalPeriodo / totalSesiones)
        : 0;
      const mejorDia        = data.reduce(
        (max, d) => (d.total > max.total ? d : max),
        { label: "-", total: 0, fecha: "", sesiones: 0 }
      );

      // ── Comparación con el período anterior ───────────────────────
      // (mismo intervalo de tiempo antes del startDate)
      const diffMs          = ahora.getTime() - startDate.getTime();
      const prevStart       = new Date(startDate.getTime() - diffMs);
      const prevEnd         = new Date(startDate.getTime() - 1);

      const [prevRow] = await prisma.$queryRaw<{ prev_total: number }[]>`
        SELECT COALESCE(SUM("totalVenta"), 0)::float AS prev_total
        FROM   "Sesion"
        WHERE  "localId"  = ${localId}
          AND  "fechaFin" IS NOT NULL
          AND  "fechaFin" >= ${prevStart}
          AND  "fechaFin" <= ${prevEnd}
      `;

      const prevTotal    = prevRow?.prev_total ?? 0;
      const variacion    = prevTotal > 0
        ? Math.round(((totalPeriodo - prevTotal) / prevTotal) * 100)
        : totalPeriodo > 0 ? 100 : 0;

      return NextResponse.json({
        data,
        resumen: {
          totalPeriodo,
          totalSesiones,
          ticketPromedio,
          mejorDia: { label: mejorDia.label, total: mejorDia.total },
          prevTotal,
          variacion,    // + positivo, - negativo
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // MODO: TOP PRODUCTOS
    // Devuelve los productos más vendidos por unidades e ingresos
    // Incluye desglose por categoría para filtrar en el frontend
    // ─────────────────────────────────────────────────────────────────
    if (mode === "top_productos") {
      const ahora = new Date();
      let startDate: Date;

      if (range === "7d") {
        startDate = new Date(ahora);
        startDate.setDate(ahora.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (range === "4w") {
        startDate = new Date(ahora);
        startDate.setDate(ahora.getDate() - 27);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // 12m
        startDate = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);
      }

      // Una sola query SQL con JOIN — Postgres agrupa todo
      // Traemos top 20 para que el frontend pueda paginar/filtrar
      const rows = await prisma.$queryRaw<{
        producto_id:   number;
        nombre:        string;
        categoria:     string;
        unidades:      bigint;
        ingresos:      number;
        precio_prom:   number;
      }[]>`
        SELECT
          p.id                          AS producto_id,
          p.nombre                      AS nombre,
          c.nombre                      AS categoria,
          SUM(ip.cantidad)              AS unidades,
          SUM(ip.cantidad * ip.precio)::float AS ingresos,
          AVG(ip.precio)::float         AS precio_prom
        FROM "ItemPedido" ip
        JOIN "Pedido"     pd ON pd.id        = ip."pedidoId"
        JOIN "Producto"   p  ON p.id         = ip."productoId"
        JOIN "Categoria"  c  ON c.id         = p."categoriaId"
        JOIN "Sesion"     s  ON s.id         = pd."sesionId"
        WHERE
          pd."localId" = ${localId}
          AND pd.estado != 'CANCELADO'
          AND s."fechaFin" IS NOT NULL
          AND s."fechaFin" >= ${startDate}
          AND s."fechaFin" <= ${ahora}
        GROUP BY p.id, p.nombre, c.nombre
        ORDER BY unidades DESC
        LIMIT 20
      `;

      // Normalizamos bigint → number
      const productos = rows.map((r, i) => ({
        rank:        i + 1,
        productoId:  r.producto_id,
        nombre:      r.nombre,
        categoria:   r.categoria,
        unidades:    Number(r.unidades),
        ingresos:    Math.round(r.ingresos),
        precioProm:  Math.round(r.precio_prom),
      }));

      // Totales globales del período (para calcular % de participación)
      const totalUnidades = productos.reduce((s, p) => s + p.unidades, 0);
      const totalIngresos = productos.reduce((s, p) => s + p.ingresos, 0);

      // Añadimos % de participación a cada producto
      const productosConPct = productos.map((p) => ({
        ...p,
        pctUnidades: totalUnidades > 0
          ? Math.round((p.unidades / totalUnidades) * 100)
          : 0,
        pctIngresos: totalIngresos > 0
          ? Math.round((p.ingresos / totalIngresos) * 100)
          : 0,
      }));

      // Categorías únicas para el filtro del frontend
      const categorias = [...new Set(productosConPct.map((p) => p.categoria))];

      return NextResponse.json({
        productos: productosConPct,
        resumen: {
          totalUnidades,
          totalIngresos,
          totalProductosDistintos: productosConPct.length,
          topProducto: productosConPct[0] ?? null,
        },
        categorias,
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // MODO: TICKET PROMEDIO + DURACIÓN DE SESIONES
    // Por cada punto del rango:
    //   · ticket promedio = totalVenta / cant sesiones
    //   · duración promedio de sesión en minutos
    //   · distribución de sesiones por franja horaria (para heatmap)
    // ─────────────────────────────────────────────────────────────────
    if (mode === "ticket_sesiones") {
      const ahora = new Date();
      let startDate: Date;
      let groupFormat: string;

      if (range === "7d") {
        startDate = new Date(ahora);
        startDate.setDate(ahora.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        groupFormat = "day";
      } else if (range === "4w") {
        startDate = new Date(ahora);
        startDate.setDate(ahora.getDate() - 27);
        startDate.setHours(0, 0, 0, 0);
        groupFormat = "day";
      } else {
        startDate   = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);
        groupFormat = "month";
      }

      // ── Query principal: ticket + duración por período ─────────────
      const rows = await prisma.$queryRaw<{
        periodo:       Date;
        sesiones:      bigint;
        ticket_prom:   number;
        duracion_prom: number;   // minutos promedio
        total_ventas:  number;
      }[]>`
        SELECT
          DATE_TRUNC(${groupFormat}, "fechaFin")                     AS periodo,
          COUNT(*)                                                    AS sesiones,
          AVG("totalVenta")::float                                    AS ticket_prom,
          AVG(
            EXTRACT(EPOCH FROM ("fechaFin" - "fechaInicio")) / 60
          )::float                                                    AS duracion_prom,
          SUM("totalVenta")::float                                    AS total_ventas
        FROM "Sesion"
        WHERE
          "localId"    = ${localId}
          AND "fechaFin"   IS NOT NULL
          AND "fechaInicio" IS NOT NULL
          AND "fechaFin"   >= ${startDate}
          AND "fechaFin"   <= ${ahora}
        GROUP BY periodo
        ORDER BY periodo ASC
      `;

      // ── Distribución por franja horaria (para heatmap de ocupación) ─
      // Cuántas sesiones cerraron en cada hora del día en el período
      const heatmapRows = await prisma.$queryRaw<{
        hora:     number;
        sesiones: bigint;
        ticket:   number;
      }[]>`
        SELECT
          EXTRACT(HOUR FROM "fechaFin")::int   AS hora,
          COUNT(*)                             AS sesiones,
          AVG("totalVenta")::float             AS ticket
        FROM "Sesion"
        WHERE
          "localId"  = ${localId}
          AND "fechaFin"  IS NOT NULL
          AND "fechaFin"  >= ${startDate}
          AND "fechaFin"  <= ${ahora}
        GROUP BY hora
        ORDER BY hora ASC
      `;

      const heatmap = Array.from({ length: 24 }, (_, h) => {
        const found = heatmapRows.find((r) => r.hora === h);
        return {
          hora:     h,
          label:    `${String(h).padStart(2, "0")}:00`,
          sesiones: found ? Number(found.sesiones) : 0,
          ticket:   found ? Math.round(found.ticket) : 0,
        };
      });

      // ── Rellenamos huecos igual que ventas_periodo ─────────────────
      const DIAS_ES  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
      const MESES_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

      const mapa = new Map<string, typeof rows[0]>();
      for (const r of rows) {
        mapa.set(new Date(r.periodo).toISOString(), r);
      }

      const data: {
        label:       string;
        fecha:       string;
        ticket:      number;
        duracion:    number;
        sesiones:    number;
        totalVentas: number;
      }[] = [];

      if (groupFormat === "day") {
        const cursor = new Date(startDate);
        while (cursor <= ahora) {
          const match = [...mapa.entries()].find(([k]) => {
            const d = new Date(k);
            return (
              d.getUTCFullYear() === cursor.getFullYear() &&
              d.getUTCMonth()    === cursor.getMonth()    &&
              d.getUTCDate()     === cursor.getDate()
            );
          });

          const label = range === "7d"
            ? DIAS_ES[cursor.getDay()]
            : `${cursor.getDate()} ${MESES_ES[cursor.getMonth()]}`;

          data.push({
            label,
            fecha:       cursor.toISOString(),
            ticket:      match ? Math.round(match[1].ticket_prom)   : 0,
            duracion:    match ? Math.round(match[1].duracion_prom)  : 0,
            sesiones:    match ? Number(match[1].sesiones)           : 0,
            totalVentas: match ? Math.round(match[1].total_ventas)   : 0,
          });

          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        const cursor = new Date(startDate);
        while (
          cursor.getFullYear() < ahora.getFullYear() ||
          (cursor.getFullYear() === ahora.getFullYear() &&
           cursor.getMonth()    <= ahora.getMonth())
        ) {
          const match = [...mapa.entries()].find(([k]) => {
            const d = new Date(k);
            return (
              d.getUTCFullYear() === cursor.getFullYear() &&
              d.getUTCMonth()    === cursor.getMonth()
            );
          });

          data.push({
            label:       `${MESES_ES[cursor.getMonth()]} ${cursor.getFullYear()}`,
            fecha:       cursor.toISOString(),
            ticket:      match ? Math.round(match[1].ticket_prom)   : 0,
            duracion:    match ? Math.round(match[1].duracion_prom)  : 0,
            sesiones:    match ? Number(match[1].sesiones)           : 0,
            totalVentas: match ? Math.round(match[1].total_ventas)   : 0,
          });

          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      // ── Métricas globales del período ──────────────────────────────
      const totalSesiones  = data.reduce((s, d) => s + d.sesiones, 0);
      const ticketGlobal   = totalSesiones > 0
        ? Math.round(data.reduce((s, d) => s + d.ticket * d.sesiones, 0) / totalSesiones)
        : 0;
      const duracionGlobal = totalSesiones > 0
        ? Math.round(data.reduce((s, d) => s + d.duracion * d.sesiones, 0) / totalSesiones)
        : 0;

      const horaPico = heatmap.reduce(
        (max, h) => (h.sesiones > max.sesiones ? h : max),
        { hora: 0, label: "--:00", sesiones: 0, ticket: 0 }
      );

      return NextResponse.json({
        data,
        heatmap,
        resumen: {
          totalSesiones,
          ticketGlobal,
          duracionGlobal,  // minutos
          horaPico: { label: horaPico.label, sesiones: horaPico.sesiones },
        },
      });
    }


    // ─────────────────────────────────────────────────────────────────
    // MODO: RENDIMIENTO POR MESA
    // ─────────────────────────────────────────────────────────────────
    if (mode === "rendimiento_mesas") {

      const ahora = new Date();
      let startDate: Date;
      if (range === "7d")  { startDate = new Date(ahora); startDate.setDate(ahora.getDate() - 6); }
      else if (range === "4w") { startDate = new Date(ahora); startDate.setDate(ahora.getDate() - 27); }
      else { startDate = new Date(ahora); startDate.setMonth(ahora.getMonth() - 11); startDate.setDate(1); }
      startDate.setHours(0, 0, 0, 0);

      const rows = await prisma.$queryRaw<{
        mesaId:            number;
        nombre:            string;
        sector:            string | null;
        sesiones:          number;
        ingresos:          number;
        ticket_promedio:   number;
        duracion_promedio: number;
      }[]>`
        SELECT
          m.id                                                          AS "mesaId",
          m.nombre                                                      AS nombre,
          m.sector                                                      AS sector,
          COUNT(s.id)::int                                              AS sesiones,
          COALESCE(SUM(s."totalVenta"), 0)::int                        AS ingresos,
          COALESCE(AVG(s."totalVenta"), 0)::int                        AS ticket_promedio,
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (s."fechaFin" - s."fechaInicio")) / 60),
            0
          )::int                                                        AS duracion_promedio
        FROM "Mesa" m
        LEFT JOIN "Sesion" s
          ON s."mesaId"   = m.id
         AND s."localId"  = ${localId}
         AND s."fechaFin" IS NOT NULL
         AND s."fechaFin" >= ${startDate}
         AND s."fechaFin" <= ${ahora}
        WHERE m."localId" = ${localId}
          AND m."activo"  = true
        GROUP BY m.id, m.nombre, m.sector
        ORDER BY ingresos DESC
      `;

      const totalIngresos = rows.reduce((s, r) => s + r.ingresos, 0);
      const totalSesiones = rows.reduce((s, r) => s + r.sesiones, 0);

      const data = rows.map((r) => ({
        ...r,
        participacion: totalIngresos > 0
          ? Math.round((r.ingresos / totalIngresos) * 100)
          : 0,
      }));

      return NextResponse.json({ data, resumen: { totalIngresos, totalSesiones } });
    }

    // ─────────────────────────────────────────────────────────────────
    // MODO: VELOCIDAD DE SERVICIO
    // ─────────────────────────────────────────────────────────────────
    if (mode === "velocidad_servicio") {

      const ahora = new Date();
      let startDate: Date;
      let truncUnit: string;

      if (range === "7d") {
        startDate = new Date(ahora); startDate.setDate(ahora.getDate() - 6);
        truncUnit = "day";
      } else if (range === "4w") {
        startDate = new Date(ahora); startDate.setDate(ahora.getDate() - 27);
        truncUnit = "day";
      } else {
        startDate = new Date(ahora); startDate.setMonth(ahora.getMonth() - 11); startDate.setDate(1);
        truncUnit = "month";
      }
      startDate.setHours(0, 0, 0, 0);

      const rawRows = await prisma.$queryRaw<{
        periodo:              Date;
        sesiones:             number;
        tiempo_primer_pedido: number;
        duracion_sesion:      number;
      }[]>`
        SELECT
          DATE_TRUNC(${truncUnit}, s."fechaFin")                          AS periodo,
          COUNT(DISTINCT s.id)::int                                       AS sesiones,
          COALESCE(AVG(
            EXTRACT(EPOCH FROM (primer.primera_fecha - s."fechaInicio")) / 60
          ), 0)::int                                                      AS tiempo_primer_pedido,
          COALESCE(AVG(
            EXTRACT(EPOCH FROM (s."fechaFin" - s."fechaInicio")) / 60
          ), 0)::int                                                      AS duracion_sesion
        FROM "Sesion" s
        LEFT JOIN (
          SELECT "sesionId", MIN(fecha) AS primera_fecha
          FROM "Pedido"
          GROUP BY "sesionId"
        ) primer ON primer."sesionId" = s.id
        WHERE s."localId"  = ${localId}
          AND s."fechaFin" IS NOT NULL
          AND s."fechaFin" >= ${startDate}
          AND s."fechaFin" <= ${ahora}
        GROUP BY periodo
        ORDER BY periodo ASC
      `;

      // Formateamos la etiqueta aquí para no pelear con TO_CHAR de SQL
      const serieRows = rawRows.map(r => {
        const d = new Date(r.periodo);
        const dia = String(d.getUTCDate()).padStart(2, '0');
        const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
        
        let label = `${dia}/${mes}`;
        // Si estamos viendo todo el año, la etiqueta es mes/año (ej. 03/24)
        if (range === "12m") {
          label = `${mes}/${String(d.getUTCFullYear()).slice(-2)}`;
        }

        return {
          label,
          sesiones: Number(r.sesiones),
          tiempo_primer_pedido: Number(r.tiempo_primer_pedido),
          duracion_sesion: Number(r.duracion_sesion)
        };
      });

      const globalRow = await prisma.$queryRaw<{
        total_sesiones:      number;
        avg_primer_pedido:   number;
        avg_duracion:        number;
        sesiones_sin_pedido: number;
      }[]>`
        SELECT
          COUNT(DISTINCT s.id)::int                                            AS total_sesiones,
          COALESCE(AVG(
            EXTRACT(EPOCH FROM (primer.primera_fecha - s."fechaInicio")) / 60
          ), 0)::int                                                           AS avg_primer_pedido,
          COALESCE(AVG(
            EXTRACT(EPOCH FROM (s."fechaFin" - s."fechaInicio")) / 60
          ), 0)::int                                                           AS avg_duracion,
          COUNT(DISTINCT CASE WHEN primer."sesionId" IS NULL THEN s.id END)::int AS sesiones_sin_pedido
        FROM "Sesion" s
        LEFT JOIN (
          SELECT "sesionId", MIN(fecha) AS primera_fecha
          FROM "Pedido"
          GROUP BY "sesionId"
        ) primer ON primer."sesionId" = s.id
        WHERE s."localId"  = ${localId}
          AND s."fechaFin" IS NOT NULL
          AND s."fechaFin" >= ${startDate}
          AND s."fechaFin" <= ${ahora}
      `;

      const g = globalRow[0] ?? { total_sesiones: 0, avg_primer_pedido: 0, avg_duracion: 0, sesiones_sin_pedido: 0 };

      return NextResponse.json({
        data: serieRows,
        resumen: {
          totalSesiones:     g.total_sesiones,
          timerPrimerPedido: g.avg_primer_pedido,
          duracionPromedio:  g.avg_duracion,
          sesionesSinPedido: g.sesiones_sin_pedido,
        },
      });
    }

    return NextResponse.json({ error: "Modo no válido" }, { status: 400 });

  } catch (error) {
    console.error("Error analytics:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}