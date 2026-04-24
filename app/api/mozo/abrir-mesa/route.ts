import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session || !["MOZO", "ADMIN", "SUPER_ADMIN"].includes(session.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!session.localId) {
      return NextResponse.json({ error: "Sin local asignado" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.mesaId) {
      return NextResponse.json({ error: "Falta el ID de la mesa" }, { status: 400 });
    }

    const mesaIdInt = Number(body.mesaId);

    // Buscar la mesa filtrando por localId del usuario — previene cross-tenant
    const mesa = await prisma.mesa.findUnique({
      where: { id: mesaIdInt },
      select: { id: true, localId: true, sesionActivaId: true },
    });

    if (!mesa || mesa.localId !== session.localId) {
      return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
    }

    // Si esta mesa fue unida a otra sesión, devolver el token de la sesión principal
    if (mesa.sesionActivaId !== null) {
      const sesionPrincipal = await prisma.sesion.findFirst({
        where: { id: mesa.sesionActivaId, localId: session.localId, fechaFin: null },
        select: { tokenEfimero: true },
      });
      if (sesionPrincipal) {
        return NextResponse.json({ token: sesionPrincipal.tokenEfimero, merged: true });
      }
      // La sesión principal ya cerró: limpiar el puntero colgado
      await prisma.mesa.update({ where: { id: mesaIdInt }, data: { sesionActivaId: null } });
    }

    const sesionExistente = await prisma.sesion.findFirst({
      where: { mesaId: mesaIdInt, localId: session.localId, fechaFin: null },
      orderBy: { fechaInicio: "desc" },
      select: { tokenEfimero: true },
    });

    if (sesionExistente) {
      return NextResponse.json({ token: sesionExistente.tokenEfimero });
    }

    const nuevoToken = randomBytes(32).toString("hex");

    const nuevaSesion = await prisma.sesion.create({
      data: {
        mesaId: mesaIdInt,
        localId: session.localId,
        tokenEfimero: nuevoToken,
        nombreHost: "Mozo",
        fechaInicio: new Date(),
        expiraEn: new Date(Date.now() + 4 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ token: nuevaSesion.tokenEfimero });
  } catch (error) {
    console.error("Error en abrir-mesa:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}