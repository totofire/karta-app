import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ── Helper: próximo número correlativo del local ──────────────────────────────
async function siguienteNumero(localId: number): Promise<number> {
  const ultima = await prisma.mesa.findFirst({
    where: { localId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (ultima?.numero ?? 0) + 1;
}

export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mesas = await prisma.mesa.findMany({
    where: { activo: true, localId },
    orderBy: [{ sector: "asc" }, { numero: "asc" }],
  });

  // Sort secundario por nombre numérico dentro del mismo sector
  mesas.sort((a, b) => {
    if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
    if (a.numero !== b.numero) return a.numero - b.numero;
    return a.nombre.localeCompare(b.nombre, undefined, { numeric: true });
  });

  return NextResponse.json(mesas);
}

export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  try {
    // ── MODO RÁPIDO ───────────────────────────────────────────────────────────
    if (body.tipo === "rapida") {
      const { cantidad, inicio, sector } = body;
      const start         = Number(inicio);
      const count         = Number(cantidad);
      const sectorElegido = sector || "General";

      // Obtenemos el próximo número UNA sola vez para asignar en secuencia
      const baseNumero = await siguienteNumero(localId);

      const promesas = Array.from({ length: count }).map(async (_, i) => {
        const nombre = `Mesa ${start + i}`;

        const nombreOcupado = await prisma.mesa.findFirst({
          where: { nombre, activo: true, localId },
        });

        if (nombreOcupado) return { status: "error", nombre, reason: "Ya existe activa" };

        try {
          const nueva = await prisma.mesa.create({
            data: {
              nombre,
              numero: baseNumero + i,
              sector: sectorElegido,
              localId,
            },
          });
          return { status: "ok", data: nueva };
        } catch (e) {
          return { status: "error", nombre, reason: "Error guardando" };
        }
      });

      const resultados = await Promise.all(promesas);
      const creadas    = resultados.filter((r) => r.status === "ok").length;
      const fallidas   = resultados.filter((r) => r.status === "error").map((r) => r.nombre);

      return NextResponse.json({ success: true, creadas, fallidas });
    }

    // ── MODO MANUAL ───────────────────────────────────────────────────────────
    else {
      const { nombre, sector, posX, posY } = body;

      const nombreOcupado = await prisma.mesa.findFirst({
        where: { nombre, activo: true, localId },
      });

      if (nombreOcupado) {
        return NextResponse.json(
          { error: "⚠️ El nombre ya existe en este local." },
          { status: 400 }
        );
      }

      const numero = await siguienteNumero(localId);

      const nueva = await prisma.mesa.create({
        data: {
          nombre,
          numero,
          sector: sector || "General",
          posX:   posX || 0,
          posY:   posY || 0,
          localId,
        },
      });

      return NextResponse.json(nueva);
    }
  } catch (error) {
    console.error("Error creando mesa:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}