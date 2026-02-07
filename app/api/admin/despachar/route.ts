import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { pedidoId, sector } = await req.json(); // sector: 'cocina' | 'barra'

    if (!pedidoId || !sector) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Determinar el flag de categoría basado en el sector
    // Si es 'cocina', buscamos categorías con imprimirCocina = true
    // Si es 'barra', buscamos categorías con imprimirCocina = false
    const esCocina = sector === 'cocina';

    // 2. Buscar los items PENDIENTES de este pedido que correspondan al sector
    const itemsAActualizar = await prisma.itemPedido.findMany({
      where: {
        pedidoId: Number(pedidoId),
        estado: "PENDIENTE",
        producto: {
          categoria: {
            imprimirCocina: esCocina // <--- ESTO ES EL FILTRO CLAVE
          }
        }
      },
      select: { id: true } // Solo necesitamos los IDs
    });

    const idsParaActualizar = itemsAActualizar.map(i => i.id);

    // 3. Actualizar esos items a "ENTREGADO"
    if (idsParaActualizar.length > 0) {
      await prisma.itemPedido.updateMany({
        where: {
          id: { in: idsParaActualizar }
        },
        data: { estado: "ENTREGADO" }
      });
    }

    // 4. VERIFICACIÓN GLOBAL: 
    // ¿Quedan items pendientes en TODO el pedido (sea cocina o barra)?
    const itemsPendientesTotal = await prisma.itemPedido.count({
      where: {
        pedidoId: Number(pedidoId),
        estado: "PENDIENTE"
      }
    });

    // 5. Actualizar el estado del PEDIDO PADRE
    if (itemsPendientesTotal === 0) {
      // Si no queda nada pendiente, el pedido está completo
      await prisma.pedido.update({
        where: { id: Number(pedidoId) },
        data: { estado: "ENTREGADO" }
      });
    } else {
      // Si todavía quedan cosas (ej: despachaste cocina pero falta barra),
      // nos aseguramos que el pedido esté "EN_PREPARACION" y no "PENDIENTE"
      // para que el admin general vea que ya se está trabajando.
      await prisma.pedido.update({
        where: { id: Number(pedidoId) },
        data: { estado: "EN_PREPARACION" }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error al despachar:", error);
    return NextResponse.json({ error: "Error despachando" }, { status: 500 });
  }
}