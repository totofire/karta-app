import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  const pedidos = await prisma.pedido.findMany({
    where: { 
      estado: { in: ['PENDIENTE', 'EN_PREPARACION'] } 
    },
    include: {
      items: {
        include: {
          producto: {
            include: { categoria: true } // IMPORTANTE: Traer la categoría para ver el flag
          }
        }
      },
      sesion: {
        include: { mesa: true }
      }
    },
    orderBy: { fecha: 'asc' }
  });

  // --- EL FILTRO MÁGICO ---
  const pedidosFiltrados = pedidos.map(p => {
    // 1. Nos quedamos solo con los items cuya categoría tiene 'imprimirCocina: true'
    const itemsCocina = p.items.filter(item => item.producto.categoria.imprimirCocina === true);
    
    // 2. Devolvemos el pedido modificado
    return { ...p, items: itemsCocina };
  })
  // 3. Si un pedido se quedó sin items (ej: era solo una Coca), lo borramos de la lista final
  .filter(p => p.items.length > 0);

  return NextResponse.json(pedidosFiltrados);
}

// El POST dejalo igual
export async function POST(req: Request) {
  const { pedidoId, nuevoEstado } = await req.json();
  await prisma.pedido.update({
    where: { id: pedidoId },
    data: { estado: nuevoEstado }
  });
  return NextResponse.json({ success: true });
}