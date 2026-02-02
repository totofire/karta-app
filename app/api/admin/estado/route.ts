import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mesas = await prisma.mesa.findMany({
      include: {
        sesiones: {
          where: { fechaFin: null }, // Buscamos sesión activa
          include: {
            pedidos: {
              include: { items: true } // Para calcular el total
            }
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    // Transformamos los datos para el front
    const estadoMesas = mesas.map((mesa) => {
      const sesionActiva = mesa.sesiones[0];
      
      let total = 0;
      let ultimoPedido = null;

      if (sesionActiva) {
        // Calcular total
        sesionActiva.pedidos.forEach(p => {
          p.items.forEach(item => {
            total += item.precio * item.cantidad;
          });
        });
        
        // Hora del último pedido (visual)
        if (sesionActiva.pedidos.length > 0) {
          const ultimo = sesionActiva.pedidos[sesionActiva.pedidos.length - 1];
          ultimoPedido = new Date(ultimo.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
      }

      return {
        id: mesa.id,
        nombre: mesa.nombre,
        qr_token: mesa.qr_token, // <--- ¡ESTA LÍNEA ES LA QUE FALTABA!
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