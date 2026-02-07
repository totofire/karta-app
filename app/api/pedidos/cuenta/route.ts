import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { tokenEfimero } = await req.json();

    if (!tokenEfimero) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Actualizamos la sesión
    // No hace falta validar localId aquí porque el tokenEfimero es único globalmente
    // y solo afecta a esa sesión específica.
    await prisma.sesion.update({
      where: { tokenEfimero },
      data: { solicitaCuenta: new Date() }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}