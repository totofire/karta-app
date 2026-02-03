import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const pedidos = await prisma.pedido.findMany({
    where: { 
      // Traemos pendientes. Podrías querer ver también los 'EN_PREPARACION' si la barra tiene procesos largos.
      estado: { in: ['PENDIENTE', 'EN_PREPARACION'] } 
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

  // --- EL FILTRO INVERTIDO (BARRA) ---
  const pedidosBarra = pedidos.map(p => {
    // NOS QUEDAMOS CON LO QUE *NO* VA A COCINA (Bebidas, etc.)
    const itemsBarra = p.items.filter(item => item.producto.categoria.imprimirCocina === false);
    
    return { ...p, items: itemsBarra };
  })
  // Filtramos los pedidos que quedaron vacíos (ej: era solo una hamburguesa)
  .filter(p => p.items.length > 0);

  return NextResponse.json(pedidosBarra);
}