import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic';

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

export async function GET(req: Request) {
  const localId = await getLocalId(req);
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