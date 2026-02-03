import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { orden: 'asc' },
    include: { productos: true } // Opcional, si lo necesitas
  });
  return NextResponse.json(categorias);
}

export async function POST(req: Request) {
  const { nombre, orden, imprimirCocina } = await req.json(); // <--- Recibimos imprimirCocina

  try {
    const nueva = await prisma.categoria.create({
      data: {
        nombre,
        orden: Number(orden) || 10,
        imprimirCocina: imprimirCocina // <--- Lo guardamos
      }
    });
    return NextResponse.json(nueva);
  } catch (error) {
    return NextResponse.json({ error: "Error creando categoría" }, { status: 500 });
  }
}