import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Forzamos dinamismo para que no cachee datos viejos
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Buscamos pedidos que NO estén terminados ni cancelados
    const pedidos = await prisma.pedido.findMany({
      where: { 
        estado: { notIn: ['ENTREGADO', 'CANCELADO'] } 
      },
      include: {
        items: {
          include: {
            producto: {
              include: { categoria: true } // Necesitamos esto para saber si va a cocina
            }
          }
        },
        sesion: {
          include: { mesa: true }
        }
      },
      orderBy: { fecha: 'asc' }
    });

    // 2. Filtramos en memoria para dejar SOLO lo que le interesa a la cocina
    const pedidosCocina = pedidos.map(p => {
      // Nos quedamos con los items que:
      // A) Son de cocina (imprimirCocina === true)
      // B) Todavía no se entregaron (estado === 'PENDIENTE')
      const itemsCocinaPendientes = p.items.filter(item => 
          item.producto.categoria.imprimirCocina === true && 
          item.estado === 'PENDIENTE'
      );
      
      // Devolvemos el pedido con la lista de items filtrada
      return { ...p, items: itemsCocinaPendientes };
    })
    // 3. Si al pedido no le quedaron items pendientes para cocina, lo sacamos de la lista
    .filter(p => p.items.length > 0);

    return NextResponse.json(pedidosCocina);

  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo comandas" }, { status: 500 });
  }
}