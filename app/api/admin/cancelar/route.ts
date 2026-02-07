import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { pedidoId, motivo } = await req.json();

    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { 
        estado: "CANCELADO",
        // Si tuvieras un campo 'nota' o 'motivoCancelacion' en la BD, lo guardas aquí
      },
    });

    // Opcional: Si el pedido tenía items que restan stock, aquí los devolverías.

    return NextResponse.json(pedido);
  } catch (error) {
    return NextResponse.json({ error: "Error cancelando" }, { status: 500 });
  }
}