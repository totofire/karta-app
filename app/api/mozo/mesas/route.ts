import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth"; // Asumo que tienes tu lógica de auth aquí

export const dynamic = "force-dynamic";

export async function GET() {
  const localId = await getLocalId(); // Obtener ID del local del usuario logueado
  
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const mesas = await prisma.mesa.findMany({
      where: { 
        localId: localId,
        activo: true 
      },
      include: {
        // Incluimos sesiones ABIERTAS para saber si está ocupada
        sesiones: {
          where: { fechaFin: null }
        }
      },
      orderBy: { nombre: 'asc' } // O por 'orden' si tienes ese campo
    });

    // Transformamos los datos para el frontend
    const mesasConEstado = mesas.map(m => ({
      id: m.id,
      nombre: m.nombre,
      sector: m.sector,
      ocupada: m.sesiones.length > 0 // Si tiene sesiones abiertas, está ocupada
    }));

    return NextResponse.json(mesasConEstado);

  } catch (error) {
    return NextResponse.json({ error: "Error cargando mesas" }, { status: 500 });
  }
}