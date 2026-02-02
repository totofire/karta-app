import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: 'asc' }, // Para que el menú salga ordenado
    include: { _count: { select: { productos: true } } } // Contamos cuántos productos tiene
  });
  return NextResponse.json(categorias);
}

export async function POST(req: Request) {
  const { nombre, orden } = await req.json();
  try {
    const nueva = await prisma.categoria.create({
      data: {
        nombre,
        orden: Number(orden) || 10
      }
    });
    return NextResponse.json(nueva);
  } catch (error) {
    return NextResponse.json({ error: "Error creando categoría" }, { status: 500 });
  }
}