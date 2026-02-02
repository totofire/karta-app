import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

// GET: Solo trae las activas
export async function GET() {
  const mesas = await prisma.mesa.findMany({
    where: { activo: true },
    orderBy: { id: 'asc' }
  });
  return NextResponse.json(mesas);
}

// Función para garantizar que el QR sea único (token-1, token-2, etc.)
async function generarTokenUnico(baseToken: string) {
  let token = baseToken;
  let counter = 1;
  while (true) {
    const existe = await prisma.mesa.findUnique({ where: { qr_token: token } });
    if (!existe) return token;
    token = `${baseToken}-${counter}`;
    counter++;
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    // --- MODO RÁPIDO (Bulk) ---
    if (body.tipo === 'rapida') {
      const { cantidad, inicio } = body;
      const mesasCreadas = [];
      const errores = [];

      for (let i = 0; i < Number(cantidad); i++) {
        const numero = Number(inicio) + i;
        const nombre = `Mesa ${numero}`;
        let qr_token = `mesa-${numero}`;

        // Validamos nombre SOLO contra mesas activas
        const nombreOcupado = await prisma.mesa.findFirst({
          where: { nombre: nombre, activo: true }
        });

        if (nombreOcupado) {
          errores.push(`${nombre} (Ya existe activa)`);
          continue; 
        }

        // El QR siempre debe ser único (aunque la otra esté inactiva)
        qr_token = await generarTokenUnico(qr_token);

        const nueva = await prisma.mesa.create({
          data: { nombre, qr_token }
        });
        mesasCreadas.push(nueva);
      }

      return NextResponse.json({ 
        success: true, 
        creadas: mesasCreadas.length, 
        fallidas: errores 
      });
    } 
    
    // --- MODO MANUAL ---
    else {
      // Validamos nombre SOLO contra mesas activas
      const nombreOcupado = await prisma.mesa.findFirst({
        where: { nombre: body.nombre, activo: true }
      });

      if (nombreOcupado) {
        return NextResponse.json(
          { error: `⚠️ El nombre "${body.nombre}" ya está siendo usado por una mesa activa.` }, 
          { status: 400 }
        );
      }

      // Generamos token único si hace falta
      const qrFinal = await generarTokenUnico(body.qr_token);

      const nueva = await prisma.mesa.create({
        data: {
          nombre: body.nombre,
          qr_token: qrFinal
        }
      });
      
      return NextResponse.json(nueva);
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}