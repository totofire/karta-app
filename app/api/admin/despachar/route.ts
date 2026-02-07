import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

async function getLocalId(req: Request): Promise<number | null> {
  const tokenCookie = req.headers.get("cookie")?.split("; ").find(c => c.startsWith("token="));
  if (!tokenCookie) return null;
  const token = tokenCookie.split("=")[1];
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    return payload.localId as number;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const localId = await getLocalId(req);
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { pedidoId, sector } = await req.json(); // sector: 'cocina' | 'barra'

    if (!pedidoId || !sector) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Determinar el flag de categoría basado en el sector
    const esCocina = sector === 'cocina';

    // 2. Buscar items PENDIENTES de este pedido + VALIDAR QUE SEA DE MI LOCAL
    const itemsAActualizar = await prisma.itemPedido.findMany({
      where: {
        pedidoId: Number(pedidoId),
        estado: "PENDIENTE",
        // SEGURIDAD: Validamos que el PEDIDO sea de mi local
        pedido: {
            localId: localId 
        },
        producto: {
          categoria: {
            imprimirCocina: esCocina
          }
        }
      },
      select: { id: true }
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

    // 4. VERIFICACIÓN GLOBAL DEL PEDIDO
    const itemsPendientesTotal = await prisma.itemPedido.count({
      where: {
        pedidoId: Number(pedidoId),
        estado: "PENDIENTE"
      }
    });

    // 5. Actualizar estado del PEDIDO PADRE
    if (itemsPendientesTotal === 0) {
      await prisma.pedido.update({
        where: { id: Number(pedidoId) },
        data: { estado: "ENTREGADO" }
      });
    } else {
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