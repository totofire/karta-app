import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId, requireAdmin } from "@/lib/auth";

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const categorias = await prisma.categoria.findMany({
    where: { 
      localId: localId // <--- SOLO MIS CATEGORÍAS
    },
    orderBy: { orden: 'asc' },
    include: { productos: true }
  });
  return NextResponse.json(categorias);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { localId } = admin;

  const { nombre, orden, imprimirCocina } = await req.json();

  try {
    const nueva = await prisma.categoria.create({
      data: {
        nombre,
        orden: Number(orden) || 10,
        imprimirCocina: imprimirCocina,
        localId: localId // <--- ASIGNACIÓN AUTOMÁTICA
      }
    });
    return NextResponse.json(nueva);
  } catch (error) {
    return NextResponse.json({ error: "Error creando categoría" }, { status: 500 });
  }
}