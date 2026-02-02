import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic'; // CRÍTICO: No cachear para ver datos en vivo

export async function GET() {
  // 1. Buscamos todas las mesas
  const mesas = await prisma.mesa.findMany({
    include: {
      sesiones: {
        // Solo traemos la sesión que está ABIERTA (fechaFin es null)
        where: { fechaFin: null },
        include: {
          pedidos: {
            // Incluimos items para calcular la plata
            include: { items: true }
          }
        }
      }
    },
    orderBy: { id: 'asc' } // Ordenadas por número (Mesa 1, Mesa 2...)
  });

  // 2. Masticamos los datos para enviarlos limpios al frente
  const estadoMesas = mesas.map(mesa => {
    const sesionActiva = mesa.sesiones[0]; // Solo puede haber 1 o ninguna
    
    let totalActual = 0;
    
    // Si hay sesión, sumamos la plata de todos los pedidos NO cancelados
    if (sesionActiva) {
      sesionActiva.pedidos.forEach(pedido => {
        if (pedido.estado !== "CANCELADO") {
           pedido.items.forEach(item => {
             totalActual += item.precio * item.cantidad;
           });
        }
      });
    }

    return {
      id: mesa.id,
      nombre: mesa.nombre,
      estado: sesionActiva ? "OCUPADA" : "LIBRE",
      sesionId: sesionActiva?.id || null,
      totalActual: totalActual,
      horaInicio: sesionActiva?.fechaInicio || null,
      ultimoPedido: sesionActiva?.pedidos.length > 0 
        ? sesionActiva.pedidos[sesionActiva.pedidos.length - 1].nombreCliente 
        : null
    };
  });

  return NextResponse.json(estadoMesas);
}