import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const pedidos = await prisma.pedido.findMany({
      where: { 
        localId: localId, // <--- FILTRO POR LOCAL
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

    const pedidosCocina = pedidos.map(p => {
      const itemsCocinaPendientes = p.items.filter(item => 
          item.producto.categoria.imprimirCocina === true && 
          item.estado === 'PENDIENTE'
      );
      
      return { ...p, items: itemsCocinaPendientes };
    })
    .filter(p => p.items.length > 0);

    return NextResponse.json(pedidosCocina);

  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo comandas" }, { status: 500 });
  }
}