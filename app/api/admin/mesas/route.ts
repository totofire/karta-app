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

  const mesas = await prisma.mesa.findMany({
    where: { 
      activo: true,
      localId: localId 
    },
    orderBy: [
      { sector: 'asc' },
      { nombre: 'asc' }
    ]
  });
  
  mesas.sort((a, b) => {
    if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
    return a.nombre.localeCompare(b.nombre, undefined, { numeric: true });
  });

  return NextResponse.json(mesas);
}

export async function POST(req: Request) {
  const localId = await getLocalId(req);
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  try {
    // --- MODO RÁPIDO ---
    if (body.tipo === 'rapida') {
      const { cantidad, inicio, sector } = body;
      const start = Number(inicio);
      const count = Number(cantidad);
      const sectorElegido = sector || "General";

      const promesasDeCreacion = Array.from({ length: count }).map(async (_, i) => {
        const numero = start + i;
        const nombre = `Mesa ${numero}`;

        const nombreOcupado = await prisma.mesa.findFirst({
          where: { 
            nombre: nombre, 
            activo: true,
            localId: localId 
          }
        });
        
        if (nombreOcupado) return { status: 'error', nombre, reason: 'Ya existe activa' };

        try {
          const nueva = await prisma.mesa.create({
            data: { 
              nombre, 
              sector: sectorElegido,
              localId: localId
            }
          });
          return { status: 'ok', data: nueva };
        } catch (e) {
          return { status: 'error', nombre, reason: 'Error guardando' };
        }
      });

      const resultados = await Promise.all(promesasDeCreacion);
      const creadas = resultados.filter(r => r.status === 'ok').length;
      const fallidas = resultados.filter(r => r.status === 'error').map(r => r.nombre);

      return NextResponse.json({ success: true, creadas, fallidas });
    } 
    
    // --- MODO MANUAL ---
    else {
      const { nombre, sector, posX, posY } = body; 
      
      const nombreOcupado = await prisma.mesa.findFirst({
        where: { 
          nombre: nombre, 
          activo: true, 
          localId: localId 
        }
      });

      if (nombreOcupado) {
        return NextResponse.json({ error: `⚠️ El nombre ya existe en este local.` }, { status: 400 });
      }

      const nueva = await prisma.mesa.create({
        data: { 
          nombre, 
          sector: sector || "General",
          posX: posX || 0,
          posY: posY || 0,
          localId: localId
        }
      });
      
      return NextResponse.json(nueva);
    }

  } catch (error) {
    console.error("Error creando mesa:", error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}