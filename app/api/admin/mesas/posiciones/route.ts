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

export async function POST(req: Request) {
  const localId = await getLocalId(req);
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { posiciones } = await req.json(); // Array de { id, x, y }

    // Usamos updateMany para asegurar que cada mesa sea del localId correcto
    // (Prisma no soporta updateMany con datos diferentes por fila fácilmente, así que iteramos)
    // Pero para ser eficientes y seguros:
    
    const actualizaciones = posiciones.map((p: any) => 
      prisma.mesa.updateMany({
        where: { id: p.id, localId: localId }, // <--- SEGURIDAD
        data: { posX: p.x, posY: p.y }
      })
    );

    await prisma.$transaction(actualizaciones);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error guardando mapa" }, { status: 500 });
  }
}