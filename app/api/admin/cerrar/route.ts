import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { sesionId } = await req.json();

    if (!sesionId) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

    // 1. Buscamos la sesión asegurando que sea de MI local
    const sesion = await prisma.sesion.findFirst({ // Cambiado a findFirst para usar filtros
      where: { 
        id: sesionId,
        localId: localId // <--- SEGURIDAD
      },
      include: { pedidos: { include: { items: true } } }
    });

    if (!sesion) return NextResponse.json({ error: "Sesión no encontrada o ajena" }, { status: 404 });

    // 2. Calculamos el total
    let totalFinal = 0;
    
    sesion.pedidos.forEach((p: any) => {
      if (p.estado !== "CANCELADO") {
        p.items.forEach((i: any) => totalFinal += i.precio * i.cantidad);
      }
    });

    // 3. CERRAMOS LA SESIÓN
    await prisma.sesion.update({
      where: { id: sesionId }, // Ya validamos arriba que es nuestra
      data: {
        fechaFin: new Date(),
        totalVenta: totalFinal,
      }
    });

    return NextResponse.json({ success: true, recaudado: totalFinal });
  } catch (error) {
    console.error("Error cerrando mesa:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}