import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic';

async function getLocalId(req: Request): Promise<number | null> {
  try {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) return null;
    
    const token = cookieHeader.split('; ').find(c => c.startsWith('token='))?.split('=')[1];
    if (!token) return null;

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

  const sectores = await prisma.sector.findMany({
    where: { localId: localId }, 
    orderBy: { orden: 'asc' }
  });
  return NextResponse.json(sectores);
}

export async function POST(req: Request) {
  const localId = await getLocalId(req);
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