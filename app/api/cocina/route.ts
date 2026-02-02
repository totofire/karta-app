import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Esta línea es CRÍTICA: le dice a Next.js que NO guarde caché de esta respuesta.
// Si no la ponés, la cocina podría ver siempre los mismos pedidos viejos.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pedidosPendientes = await prisma.pedido.findMany({
      where: {
        estado: 'PENDIENTE' // Solo lo que hay que cocinar
      },
      include: {
        sesion: {
          include: {
            mesa: true // Para saber a qué mesa llevarlo
          }
        },
        items: {
          include: {
            producto: true // Para ver el nombre de la comida (Hamburguesa, etc)
          }
        }
      },
      orderBy: {
        fecha: 'asc' // FIFO: Lo primero que entra es lo primero que sale
      }
    });

    return NextResponse.json(pedidosPendientes);

  } catch (error) {
    console.error("Error buscando pedidos:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}