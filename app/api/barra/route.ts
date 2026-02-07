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

    const pedidosBarra = pedidos.map(p => {
      const itemsBarraPendientes = p.items.filter(item => 
          item.producto.categoria.imprimirCocina === false &&
          item.estado === 'PENDIENTE'
      );
      
      return { ...p, items: itemsBarraPendientes };
    })
    .filter(p => p.items.length > 0);

    return NextResponse.json(pedidosBarra);

  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo bebidas" }, { status: 500 });
  }
}