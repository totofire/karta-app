import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pedidoId = Number(searchParams.get("pedidoId"));

  if (!pedidoId) return NextResponse.json({ error: "Falta pedidoId" }, { status: 400 });

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, localId },
      include: {
        sesion: { include: { mesa: true } },
        items: {
          include: {
            producto: { include: { categoria: true } }
          }
        }
      }
    });

    if (!pedido) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Determinar el tipo según categorías de los ítems
    const tieneCocina = pedido.items.some(i => i.producto.categoria.imprimirCocina);
    const tieneBarra  = pedido.items.some(i => !i.producto.categoria.imprimirCocina);

    let tipo: "cocina" | "barra" | "ambos" = "cocina";
    if (tieneCocina && tieneBarra) tipo = "ambos";
    else if (tieneBarra) tipo = "barra";

    return NextResponse.json({
      mesaId:     pedido.sesion.mesa.id,
      mesaNombre: pedido.sesion.mesa.nombre,
      tipo,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}