import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/sectores/layout
// Devuelve el JSON de posiciones de zonas guardado en Configuracion
export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const config = await prisma.configuracion.findUnique({
    where: { localId },
    select: { mapaZonas: true },
  });

  // mapaZonas es un campo Json en Configuracion — si no existe devolvemos {}
  return NextResponse.json(config?.mapaZonas ?? {});
}

// POST /api/admin/sectores/layout
// Body: { zonas: { [sectorNombre]: { x, y, w, h } } }
export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { zonas } = await req.json();

  await prisma.configuracion.upsert({
    where:  { localId },
    update: { mapaZonas: zonas },
    create: { localId, mapaZonas: zonas },
  });

  return NextResponse.json({ success: true });
}