import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic';

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

  try {
    const sesionesCerradas = await prisma.sesion.findMany({
      where: {
        fechaFin: { not: null },
        localId: localId // <--- FILTRO DE SEGURIDAD
      },
      include: {
        mesa: true,
        pedidos: {
          include: { items: true }
        }
      },
      orderBy: {
        fechaFin: 'desc'
      }
    });

    return NextResponse.json(sesionesCerradas);
  } catch (error) {
    return NextResponse.json({ error: "Error al traer historial" }, { status: 500 });
  }
}