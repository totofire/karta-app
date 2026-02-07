import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

async function getLocalId(req: Request): Promise<number | null> {
  const tokenCookie = req.headers.get("cookie")?.split("; ").find(c => c.startsWith("token="));
  if (!tokenCookie) return null;
  const token = tokenCookie.split("=")[1];
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);
    return payload.localId as number;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const localId = await getLocalId(req);
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
  const localId = await getLocalId(req);
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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