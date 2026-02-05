import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { posiciones } = await req.json(); // Array de { id, x, y }

    // Usamos una transacción para guardar todo junto rápido
    const actualizaciones = posiciones.map((p: any) => 
      prisma.mesa.update({
        where: { id: p.id },
        data: { posX: p.x, posY: p.y }
      })
    );

    await prisma.$transaction(actualizaciones);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error guardando mapa" }, { status: 500 });
  }
}