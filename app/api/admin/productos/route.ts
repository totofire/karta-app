import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic'; // Importante para que no se guarde memoria vieja

export async function GET() {
  try {
    // Buscamos categorías con sus productos ordenados
    const categorias = await prisma.categoria.findMany({
      include: {
        productos: {
          orderBy: { orden: 'asc' }
        }
      },
      orderBy: { orden: 'asc' }
    });
    
    return NextResponse.json(categorias);
  } catch (error) {
    return NextResponse.json({ error: "Error cargando productos" }, { status: 500 });
  }
}