import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Buscamos pedidos activos
    const pedidos = await prisma.pedido.findMany({
      where: { 
        estado: { notIn: ['ENTREGADO', 'CANCELADO'] } 
      },
      include: {
        items: {
          include: {
            producto: {
              include: { categoria: true }
            }
          }
        },
        sesion: {
          include: { mesa: true }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    // 2. Filtramos para la BARRA
    const pedidosBarra = pedidos.map(p => {
      // Nos quedamos con los items que:
      // A) NO son de cocina (imprimirCocina === false) -> Bebidas, Postres, etc.
      // B) Todavía no se entregaron (estado === 'PENDIENTE')
      const itemsBarraPendientes = p.items.filter(item => 
          item.producto.categoria.imprimirCocina === false &&
          item.estado === 'PENDIENTE'
      );
      
      return { ...p, items: itemsBarraPendientes };
    })
    // 3. Limpiamos pedidos vacíos
    .filter(p => p.items.length > 0);

    return NextResponse.json(pedidosBarra);

  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo bebidas" }, { status: 500 });
  }
}