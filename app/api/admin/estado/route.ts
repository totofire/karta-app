import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mesas = await prisma.mesa.findMany({
      where: { activo: true }, // Solo traemos las activas
      include: {
        sesiones: {
          where: { fechaFin: null },
          include: {
            pedidos: { include: { items: true } }
          }
        }
      },
      orderBy: [{ sector: 'asc' }, { nombre: 'asc' }]
    });

    const estadoMesas = mesas.map((mesa) => {
      const sesionActiva = mesa.sesiones[0];
      
      let total = 0;
      let ultimoPedido = null;

      if (sesionActiva) {
        sesionActiva.pedidos.forEach(p => {
          p.items.forEach(item => {
            total += item.precio * item.cantidad;
          });
        });
        
        if (sesionActiva.pedidos.length > 0) {
          const ultimo = sesionActiva.pedidos[sesionActiva.pedidos.length - 1];
          ultimoPedido = new Date(ultimo.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
      }

      return {
        id: mesa.id,
        nombre: mesa.nombre,
        qr_token: mesa.qr_token,
        sector: mesa.sector || "General", // <--- AGREGAMOS ESTO
        estado: sesionActiva ? 'OCUPADA' : 'LIBRE',
        sesionId: sesionActiva?.id || null,
        horaInicio: sesionActiva?.fechaInicio || null,
        totalActual: total,
        ultimoPedido: ultimoPedido
      };
    });

    return NextResponse.json(estadoMesas);
  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo estado" }, { status: 500 });
  }
}