import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // LOG 1: Ver qué ID llega desde el frontend
    console.log("👉 MOZO ABRIENDO MESA. ID Recibido:", body.mesaId);

    if (!body.mesaId) {
      return NextResponse.json({ error: "Falta el ID de la mesa" }, { status: 400 });
    }

    // Convertimos estrictamente a Número
    const mesaIdInt = Number(body.mesaId);

    // 1. Buscamos la mesa para obtener su localId
    const mesa = await prisma.mesa.findUnique({
      where: { id: mesaIdInt }
    });

    if (!mesa) {
      return NextResponse.json({ error: "Mesa no encontrada en DB" }, { status: 404 });
    }

    // 2. BUSQUEDA EXHAUSTIVA de sesión abierta
    // Buscamos cualquier sesión en esa mesa que NO tenga fecha de fin.
    const sesionExistente = await prisma.sesion.findFirst({
      where: {
        mesaId: mesaIdInt,
        fechaFin: null 
      },
      orderBy: { fechaInicio: 'desc' } // Traemos la más reciente por seguridad
    });

    // LOG 2: Ver si encontró algo
    console.log("🔍 BUSQUEDA SESIÓN:", sesionExistente ? `ENCONTRADA (ID: ${sesionExistente.id})` : "NO EXISTE, SE CREARÁ UNA");

    // 3. Lógica de Decisión
    if (sesionExistente) {
      // --- CASO A: YA TIENE SESIÓN ---
      // Devolvemos el token que YA existe. NO creamos nada.
      return NextResponse.json({ token: sesionExistente.tokenEfimero });
      
    } else {
      // --- CASO B: ESTÁ LIBRE ---
      // Creamos sesión nueva
      const nuevoToken = randomBytes(16).toString("hex");
      
      const nuevaSesion = await prisma.sesion.create({
        data: {
          mesaId: mesaIdInt,
          localId: mesa.localId,
          tokenEfimero: nuevoToken,
          nombreHost: "Mozo",
          fechaInicio: new Date(),
          expiraEn: new Date(Date.now() + 4 * 60 * 60 * 1000)
        },
      });

      return NextResponse.json({ token: nuevaSesion.tokenEfimero });
    }

  } catch (error) {
    console.error("🔥 ERROR EN API MOZO:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}