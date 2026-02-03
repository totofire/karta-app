import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mesas = await prisma.mesa.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        qr_token: true,
        sector: true,
        sesiones: {
          where: { fechaFin: null },
          take: 1, // Traemos solo la sesión activa si existe
          select: {
            id: true,
            fechaInicio: true,
            pedidos: {
              select: {
                fecha: true,
                estado: true,
                items: {
                  select: {
                    cantidad: true,
                    precio: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [{ sector: 'asc' }, { nombre: 'asc' }]
    });

    // Procesamiento en memoria (Node.js es rapidísimo para esto)
    const estadoMesas = mesas.map((mesa) => {
      const sesionActiva = mesa.sesiones[0];
      
      if (!sesionActiva) {
        return {
          id: mesa.id,
          nombre: mesa.nombre,
          qr_token: mesa.qr_token,
          sector: mesa.sector || "General",
          estado: 'LIBRE',
          sesionId: null,
          horaInicio: null,
          totalActual: 0,
          ultimoPedido: null
        };
      }

      // Cálculo de totales usando reduce (sin ir a la BD de nuevo)
      const total = sesionActiva.pedidos.reduce(
        (sum, p) => sum + p.items.reduce((itemSum, i) => itemSum + (i.precio * i.cantidad), 0),
        0
      );

      const ultimoPedido = sesionActiva.pedidos.length > 0
        ? new Date(sesionActiva.pedidos[sesionActiva.pedidos.length - 1].fecha)
            .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

      return {
        id: mesa.id,
        nombre: mesa.nombre,
        qr_token: mesa.qr_token,
        sector: mesa.sector || "General",
        estado: 'OCUPADA',
        sesionId: sesionActiva.id,
        horaInicio: sesionActiva.fechaInicio,
        totalActual: total,
        ultimoPedido
      };
    });

    return NextResponse.json(estadoMesas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error obteniendo estado" }, { status: 500 });
  }
}