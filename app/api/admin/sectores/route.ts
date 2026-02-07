import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sectores = await prisma.sector.findMany({
    where: { localId: localId }, 
    orderBy: { orden: 'asc' }
  });
  return NextResponse.json(sectores);
}

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre } = await req.json();

  try {
    const nuevo = await prisma.sector.create({
      data: { 
        nombre: nombre.trim(),
        orden: 10,
        localId: localId
      }
    });
    return NextResponse.json(nuevo);
  } catch (error) {
    return NextResponse.json(
      { error: "⚠️ Ese sector ya existe en este local." }, 
      { status: 400 }
    );
  }
}