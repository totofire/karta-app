import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const mesas = await prisma.mesa.findMany({
      where: { 
        activo: true,
        localId: localId
      },
      select: {
        id: true,
        nombre: true,
        qr_token: true,
        sector: true,
        posX: true, 
        posY: true,
        sesiones: {
          where: { fechaFin: null },
          take: 1, 
          select: {
            id: true,
            fechaInicio: true,
            solicitaCuenta: true, 
            pedidos: {
              where: { estado: { not: "CANCELADO" } }, 
              select: {
                fecha: true,
                estado: true,
                items: {
                  select: {
                    cantidad: true,
                    precio: true,
                    producto: { 
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

    const estadoMesas = mesas.map((mesa) => {
      const sesionActiva = mesa.sesiones[0];
      
      let infoSesion: any = {
        estado: 'LIBRE',
        sesionId: null,
        horaInicio: null,
        totalActual: 0,
        ultimoPedido: null,
        detalles: [],
        solicitaCuenta: null
      };

      if (sesionActiva) {
        const mapaDetalles = new Map();
        let totalGeneral = 0;

        sesionActiva.pedidos.forEach(pedido => {
            pedido.items.forEach(item => {
                const nombreProd = item.producto.nombre;
                const subtotalItem = item.precio * item.cantidad;
                totalGeneral += subtotalItem;

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

        const detalles = Array.from(mapaDetalles.values());
        const ultimoPedido = sesionActiva.pedidos.length > 0
            ? new Date(sesionActiva.pedidos[sesionActiva.pedidos.length - 1].fecha)
                .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null;

        infoSesion = {
            estado: 'OCUPADA',
            sesionId: sesionActiva.id,
            horaInicio: sesionActiva.fechaInicio,
            totalActual: totalGeneral,
            ultimoPedido,
            detalles: detalles,
            solicitaCuenta: sesionActiva.solicitaCuenta 
        };
      }

      return {
        id: mesa.id,
        nombre: mesa.nombre,
        qr_token: mesa.qr_token,
        sector: mesa.sector || "General",
        posX: mesa.posX, 
        posY: mesa.posY, 
        ...infoSesion 
      };
    });

    return NextResponse.json(estadoMesas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error obteniendo estado" }, { status: 500 });
  }
}