import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  const mesas = await prisma.mesa.findMany({
    where: { activo: true },
    // Ordenamos primero por sector, después por nombre
    orderBy: [
      { sector: 'asc' },
      { nombre: 'asc' }
    ]
  });
  
  // Ordenamiento natural (opcional, si querés mantener el "Mesa 1, Mesa 2...")
  mesas.sort((a, b) => {
    if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
    return a.nombre.localeCompare(b.nombre, undefined, { numeric: true });
  });

  return NextResponse.json(mesas);
}

// ... función getUniqueToken (dejala como estaba) ...
async function getUniqueToken(baseToken: string) {
  let token = baseToken;
  let counter = 1;
  while (await prisma.mesa.findUnique({ where: { qr_token: token } })) {
    token = `${baseToken}-${counter}`;
    counter++;
  }
  return token;
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    // --- MODO RÁPIDO (Bulk) ---
    if (body.tipo === 'rapida') {
      const { cantidad, inicio, sector } = body; // <--- Recibimos SECTOR
      const start = Number(inicio);
      const count = Number(cantidad);
      const sectorElegido = sector || "General"; // Default

      const promesasDeCreacion = Array.from({ length: count }).map(async (_, i) => {
        const numero = start + i;
        const nombre = `Mesa ${numero}`;
        let qr_token = `mesa-${numero}`;

        // Validar nombre (solo contra activas)
        const nombreOcupado = await prisma.mesa.findFirst({
          where: { nombre: nombre, activo: true }
        });
        if (nombreOcupado) return { status: 'error', nombre, reason: 'Ya existe activa' };

        qr_token = await getUniqueToken(qr_token);

        try {
          const nueva = await prisma.mesa.create({
            data: { 
              nombre, 
              qr_token,
              sector: sectorElegido // <--- Guardamos SECTOR
            }
          });
          return { status: 'ok', data: nueva };
        } catch (e) {
          return { status: 'error', nombre, reason: 'Error guardando' };
        }
      });

      const resultados = await Promise.all(promesasDeCreacion);
      const creadas = resultados.filter(r => r.status === 'ok').length;
      const fallidas = resultados.filter(r => r.status === 'error')
        // @ts-ignore
        .map(r => r.nombre);

      return NextResponse.json({ success: true, creadas, fallidas });
    } 
    
    // --- MODO MANUAL ---
    else {
      const { nombre, qr_token, sector } = body; // <--- Recibimos SECTOR
      
      const nombreOcupado = await prisma.mesa.findFirst({
        where: { nombre, activo: true }
      });

      if (nombreOcupado) {
        return NextResponse.json({ error: `⚠️ El nombre ya existe.` }, { status: 400 });
      }

      const qrFinal = await getUniqueToken(qr_token);

      const nueva = await prisma.mesa.create({
        data: { 
          nombre, 
          qr_token: qrFinal,
          sector: sector || "General" // <--- Guardamos SECTOR
        }
      });
      
      return NextResponse.json(nueva);
    }

  } catch (error) {
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}