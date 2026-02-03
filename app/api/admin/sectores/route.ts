import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  const sectores = await prisma.sector.findMany({
    orderBy: { orden: 'asc' }
  });
  return NextResponse.json(sectores);
}

export async function POST(req: Request) {
  const { nombre } = await req.json();

  try {
    // Intentamos crear. Si ya existe, Prisma tira error por el @unique
    const nuevo = await prisma.sector.create({
      data: { 
        nombre: nombre.trim(),
        orden: 10 // Valor por defecto
      }
    });
    return NextResponse.json(nuevo);
  } catch (error) {
    // Código P2002 de Prisma = Violación de Unique Constraint
    return NextResponse.json(
      { error: "⚠️ Ese sector ya existe." }, 
      { status: 400 }
    );
  }
}