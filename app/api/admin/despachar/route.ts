import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { pedidoId, sector } = await req.json(); // sector puede ser "cocina" o "barra"

    // 1. Buscamos las categorías que corresponden a ese sector
    // Asumimos ids fijos o lógica de nombres. Ejemplo:
    // Cocina: Categorias 1, 2, 3 / Barra: Categoria 4, 5
    // O mejor, filtramos por nombres de categoría si no tienes un campo 'sector' en Categoria.
    
    // ESTRATEGIA: Obtener items del pedido y filtrar por sector
    const items = await prisma.itemPedido.findMany({
      where: { 
        pedidoId: Number(pedidoId),
        estado: "PENDIENTE"
      },
      include: { producto: { include: { categoria: true } } }
    });

    // 2. Filtramos los IDs de los items a actualizar
    const itemsAActualizar = items.filter(item => {
      const cat = item.producto.categoria.nombre.toLowerCase();
      if (sector === 'cocina') {
        return cat !== 'bebidas' && cat !== 'tragos' && cat !== 'cafeteria'; // Lógica inversa o directa
      } else {
        return cat === 'bebidas' || cat === 'tragos' || cat === 'cafeteria';
      }
    }).map(i => i.id);

    // 3. Actualizamos solo esos items a "ENTREGADO"
    if (itemsAActualizar.length > 0) {
      await prisma.itemPedido.updateMany({
        where: { id: { in: itemsAActualizar } },
        data: { estado: "ENTREGADO" }
      });
    }

    // 4. (Opcional) Verificar si TODO el pedido está listo para marcar el Pedido principal
    const itemsPendientes = await prisma.itemPedido.count({
      where: { 
        pedidoId: Number(pedidoId),
        estado: "PENDIENTE" 
      }
    });

    if (itemsPendientes === 0) {
      await prisma.pedido.update({
        where: { id: Number(pedidoId) },
        data: { estado: "ENTREGADO" }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Error despachando" }, { status: 500 });
  }
}