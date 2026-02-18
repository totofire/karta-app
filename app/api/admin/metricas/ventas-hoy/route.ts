import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import { startOfDay, endOfDay, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hoy = new Date();
  const hoyInicio = startOfDay(hoy);
  const hoyFin = endOfDay(hoy);
  
  const ayerInicio = startOfDay(subDays(hoy, 1));
  const ayerFin = endOfDay(subDays(hoy, 1));

  try {
    // 1. CONSULTAS EN PARALELO (Optimización de velocidad)
    const [sesionesHoy, sesionesAyer, pedidosActivos] = await Promise.all([
      // Sesiones CERRADAS de hoy (ya pagaron)
      prisma.sesion.findMany({
        where: { 
          localId, 
          fechaFin: { gte: hoyInicio, lte: hoyFin }
        },
        select: {
          totalVenta: true,
          fechaFin: true,
          mesa: { select: { nombre: true } }
        }
      }),
      // Sesiones CERRADAS de ayer (para comparar)
      prisma.sesion.findMany({
        where: { 
          localId, 
          fechaFin: { gte: ayerInicio, lte: ayerFin }
        },
        select: { totalVenta: true }
      }),
      // Pedidos de mesas ABIERTAS (dinero "en la mesa")
      prisma.pedido.findMany({
        where: {
          localId,
          sesion: { fechaFin: null }, // Solo mesas abiertas
          estado: { not: "CANCELADO" }
        },
        include: { 
          items: true,
          sesion: { select: { mesa: { select: { nombre: true } } } }
        }
      })
    ]);

    // 2. CÁLCULOS FINANCIEROS
    const totalCerrado = sesionesHoy.reduce((sum, s) => sum + (s.totalVenta || 0), 0);
    const totalAyer = sesionesAyer.reduce((sum, s) => sum + (s.totalVenta || 0), 0);
    
    // Sumar items de pedidos activos
    const totalActivo = pedidosActivos.reduce((sum, p) => {
      return sum + p.items.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    }, 0);

    const totalProyectado = totalCerrado + totalActivo;
    const diferencia = totalCerrado - totalAyer;
    
    // Evitar división por cero
    const porcentaje = totalAyer > 0 
      ? Math.round((diferencia / totalAyer) * 100) 
      : (totalCerrado > 0 ? 100 : 0);

    // 3. CURVA HORARIA (Ventas confirmadas por hora)
    const ventasPorHora = Array.from({ length: 24 }, (_, i) => ({ 
      hora: i, 
      label: `${i.toString().padStart(2, '0')}:00`,
      ventas: 0,
      pedidos: 0
    }));
    
    sesionesHoy.forEach(s => {
      if (s.fechaFin) {
        const hora = new Date(s.fechaFin).getHours();
        if (ventasPorHora[hora]) {
            ventasPorHora[hora].ventas += s.totalVenta || 0;
            ventasPorHora[hora].pedidos += 1;
        }
      }
    });

    // Filtramos para mostrar desde el primer movimiento o las últimas 12h
    // Esto evita que el gráfico muestre muchas horas vacías de la madrugada
    const horaActual = hoy.getHours();
    const curvaRelevante = ventasPorHora
      .filter((h, i) => i <= horaActual && (h.ventas > 0 || i >= 8)) // Muestra desde las 8am o si hubo venta
      .slice(-14); // Máximo 14 puntos para que no se apriete el gráfico

    // 4. PICOS Y VALLES
    const horaMax = ventasPorHora.reduce((max, h) => h.ventas > max.ventas ? h : max, { label: "-", ventas: 0 });
    
    const ticketPromedio = sesionesHoy.length > 0 
      ? Math.round(totalCerrado / sesionesHoy.length) 
      : 0;

    // 5. RANKING DE MESAS (Top 5 por facturación)
    const mesasMap = new Map<string, number>();
    
    // Sumamos lo cerrado
    sesionesHoy.forEach(s => {
      const nombre = s.mesa.nombre;
      mesasMap.set(nombre, (mesasMap.get(nombre) || 0) + (s.totalVenta || 0));
    });

    // Sumamos lo activo (para que el ranking sea real "en vivo")
    pedidosActivos.forEach(p => {
        const nombre = p.sesion.mesa.nombre;
        const totalPedido = p.items.reduce((s, i) => s + (i.precio * i.cantidad), 0);
        mesasMap.set(nombre, (mesasMap.get(nombre) || 0) + totalPedido);
    });
    
    const topMesas = Array.from(mesasMap.entries())
      .sort((a, b) => b[1] - a[1]) // Ordenar mayor a menor
      .slice(0, 5)
      .map(([nombre, total]) => ({ nombre, total }));

    return NextResponse.json({
      resumen: {
        cerrado: totalCerrado,
        activo: totalActivo,
        proyectado: totalProyectado,
        ayer: totalAyer,
        diferencia,
        porcentaje,
        sesiones: sesionesHoy.length,
        ticketPromedio
      },
      curva: curvaRelevante,
      picos: {
        horaPico: horaMax.label,
        ventaPico: horaMax.ventas
      },
      topMesas,
      timestamp: hoy.toISOString()
    });

  } catch (error) {
    console.error("Error en métricas detalladas:", error);
    return NextResponse.json({ error: "Error calculando datos" }, { status: 500 });
  }
}