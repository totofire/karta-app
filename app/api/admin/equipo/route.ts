import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/equipo
// Devuelve todos los mozos del local
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuarios = await prisma.usuario.findMany({
    where: { localId, rol: "MOZO" },
    select: {
      id:        true,
      nombre:    true,
      email:     true,
      activo:    true,
      fechaAlta: true,
    },
    orderBy: { fechaAlta: "desc" },
  });

  return NextResponse.json(usuarios);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/equipo
// Crea un mozo con contraseña directa — queda activo al toque
// Body: { nombre, email, password }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { nombre, email, password } = await req.json();

    if (!nombre?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Verificar que el email no esté en uso (global, no solo en este local)
    const existe = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const mozo = await prisma.usuario.create({
      data: {
        nombre:   nombre.trim(),
        email:    email.trim().toLowerCase(),
        password: passwordHash,
        rol:      "MOZO",
        activo:   true,
        localId,
      },
      select: {
        id:        true,
        nombre:    true,
        email:     true,
        activo:    true,
        fechaAlta: true,
      },
    });

    return NextResponse.json(mozo);

  } catch (error) {
    console.error("Error creando mozo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}