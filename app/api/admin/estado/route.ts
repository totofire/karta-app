import { NextResponse } from "next/server";
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
          take: 1, // Traemos solo la sesión activa
          select: {
            id: true,
            fechaInicio: true,
            pedidos: {
              where: { estado: { not: "CANCELADO" } }, // Excluimos cancelados si tienes ese estado
              select: {
                fecha: true,
                estado: true,
                items: {
                  select: {
                    cantidad: true,
                    precio: true,
                    producto: { // <--- ESTO ES NUEVO: Traemos el nombre para el ticket
                        select: { nombre: true } 
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [{ sector: 'asc' }, { nombre: 'asc' }]
    });

    // Procesamiento
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
          ultimoPedido: null,
          detalles: [] // Array vacío para evitar errores en el front
        };
      }

      // --- NUEVA LÓGICA DE AGRUPACIÓN PARA EL TICKET ---
      // Usamos un Map para sumar cantidades de productos iguales pedidos en diferentes rondas
      const mapaDetalles = new Map();
      let totalGeneral = 0;

      sesionActiva.pedidos.forEach(pedido => {
        pedido.items.forEach(item => {
            const nombreProd = item.producto.nombre;
            const subtotalItem = item.precio * item.cantidad;
            
            // Sumar al total general
            totalGeneral += subtotalItem;

            // Agrupar en el mapa
            if (mapaDetalles.has(nombreProd)) {
                const existente = mapaDetalles.get(nombreProd);
                existente.cantidad += item.cantidad;
                existente.subtotal += subtotalItem;
            } else {
                mapaDetalles.set(nombreProd, {
                    producto: nombreProd,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio,
                    subtotal: subtotalItem
                });
            }
        });
      });

      // Convertimos el mapa a array para el frontend
      const detalles = Array.from(mapaDetalles.values());

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
        totalActual: totalGeneral,
        ultimoPedido,
        detalles: detalles // <--- Aquí va la lista lista para imprimir
      };
    });

    return NextResponse.json(estadoMesas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error obteniendo estado" }, { status: 500 });
  }
}