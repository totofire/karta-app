import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Buscamos las mesas (sin ordenar por ID)
  const mesas = await prisma.mesa.findMany({
    where: { activo: true },
  });

  // 2. Aplicamos "Ordenamiento Natural" con Javascript antes de enviar
  // Esto hace que "Mesa 2" se ponga antes que "Mesa 10" automáticamente
  mesas.sort((a, b) => 
    a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
  );

  return NextResponse.json(mesas);
}

// Función auxiliar para token único (La sacamos afuera para reusar)
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
    // --- MODO RÁPIDO OPTIMIZADO (Paralelo) ---
    if (body.tipo === 'rapida') {
      const { cantidad, inicio } = body;
      const start = Number(inicio);
      const count = Number(cantidad);

      // 1. Preparamos todos los datos "en memoria" primero
      const promesasDeCreacion = Array.from({ length: count }).map(async (_, i) => {
        const numero = start + i;
        const nombre = `Mesa ${numero}`;
        let qr_token = `mesa-${numero}`;

        // Verificamos nombre (Solo choca si hay otra ACTIVA con ese nombre)
        const nombreOcupado = await prisma.mesa.findFirst({
          where: { nombre: nombre, activo: true }
        });

        if (nombreOcupado) {
          return { status: 'error', nombre, reason: 'Ya existe activa' };
        }

        // Buscamos token libre
        qr_token = await getUniqueToken(qr_token);

        // Creamos la mesa
        try {
          const nueva = await prisma.mesa.create({
            data: { nombre, qr_token }
          });
          return { status: 'ok', data: nueva };
        } catch (e) {
          return { status: 'error', nombre, reason: 'Error guardando' };
        }
      });

      // 2. DISPARAMOS TODAS JUNTAS 🚀
      const resultados = await Promise.all(promesasDeCreacion);

      // 3. Procesamos los resultados
      const creadas = resultados.filter(r => r.status === 'ok').length;
      const fallidas = resultados
        .filter(r => r.status === 'error')
        // @ts-ignore
        .map(r => r.nombre);

      return NextResponse.json({ 
        success: true, 
        creadas, 
        fallidas 
      });
    } 
    
    // --- MODO MANUAL (Sin cambios, ya es rápido porque es una sola) ---
    else {
      const nombreOcupado = await prisma.mesa.findFirst({
        where: { nombre: body.nombre, activo: true }
      });

      if (nombreOcupado) {
        return NextResponse.json({ error: `⚠️ El nombre ya existe.` }, { status: 400 });
      }

      const qrFinal = await getUniqueToken(body.qr_token);

      const nueva = await prisma.mesa.create({
        data: { nombre: body.nombre, qr_token: qrFinal }
      });
      
      return NextResponse.json(nueva);
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}