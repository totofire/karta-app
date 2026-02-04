import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { sesionId } = await req.json();

    if (!sesionId) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

    // 1. Buscamos la sesión
    const sesion = await prisma.sesion.findUnique({
      where: { id: sesionId },
      include: { pedidos: { include: { items: true } } }
    });

    if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    // 2. Calculamos el total
    let totalFinal = 0;
    
    // 🔥 CORRECCIÓN AQUÍ: Agregamos (p: any) y (i: any)
    sesion.pedidos.forEach((p: any) => {
      if (p.estado !== "CANCELADO") {
        p.items.forEach((i: any) => totalFinal += i.precio * i.cantidad);
      }
    });

    // 3. CERRAMOS LA SESIÓN
    await prisma.sesion.update({
      where: { id: sesionId },
      data: {
        fechaFin: new Date(),
        totalVenta: totalFinal,
        // tokenEfimero: null // Opcional: anular token
      }
    });

    console.log(`✅ Mesa cerrada. Total: $${totalFinal}`);

    return NextResponse.json({ success: true, recaudado: totalFinal });
  } catch (error) {
    console.error("Error cerrando mesa:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}