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
        localId,
        estado: { notIn: ["ENTREGADO", "CANCELADO"] },
      },
      select: {
        id: true,
        nombreCliente: true,
        fecha: true,
        impreso: true,
        items: {
          where: {
            estado: "PENDIENTE",
            producto: { categoria: { imprimirCocina: false } },
          },
          select: {
            cantidad: true,
            observaciones: true,
            producto: { select: { nombre: true } },
          },
        },
        sesion: {
          select: {
            mesa: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha: "asc" },
    });

    const pedidosBarra = pedidos.filter((p) => p.items.length > 0);
    return NextResponse.json(pedidosBarra);
  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo bebidas" }, { status: 500 });
  }
}
