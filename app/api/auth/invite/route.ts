import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/invite?token=xxx
// Valida que el token existe y no expiró
// El frontend lo llama al cargar la página /activar-cuenta
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { inviteToken: token },
    select: {
      id:           true,
      nombre:       true,
      email:        true,
      inviteExpira: true,
      activo:       true,
      local: {
        select: { nombre: true }
      }
    },
  });

  if (!usuario) {
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  }

  if (usuario.activo) {
    return NextResponse.json({ error: "Esta cuenta ya fue activada" }, { status: 409 });
  }

  if (usuario.inviteExpira && usuario.inviteExpira < new Date()) {
    return NextResponse.json({ error: "El link expiró. Pedile al administrador que te reenvíe la invitación." }, { status: 410 });
  }

  // Token válido — devolvemos info mínima para mostrar en el formulario
  return NextResponse.json({
    valido:      true,
    nombre:      usuario.nombre,
    email:       usuario.email,
    localNombre: usuario.local?.nombre ?? null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/invite
// Activa la cuenta: recibe { token, password } y guarda la contraseña
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña son requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { inviteToken: token },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Token inválido" }, { status: 404 });
    }

    if (usuario.activo) {
      return NextResponse.json({ error: "Esta cuenta ya fue activada" }, { status: 409 });
    }

    if (usuario.inviteExpira && usuario.inviteExpira < new Date()) {
      return NextResponse.json({ error: "El link expiró" }, { status: 410 });
    }

    // Activar cuenta: guardar contraseña, poner activo, limpiar token
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password:     password,  // Mismo patrón que el resto del sistema
        activo:       true,
        inviteToken:  null,
        inviteExpira: null,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error activando cuenta:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}