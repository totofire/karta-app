import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { local: true }
    });

    // bcrypt.compare devuelve false si usuario es null o hash inválido
    const passwordValida = usuario?.password
      ? await bcrypt.compare(password, usuario.password)
      : false;

    if (!usuario || !passwordValida) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (!usuario.activo) {
      return NextResponse.json({ error: "Usuario desactivado." }, { status: 403 });
    }

    if (usuario.local && usuario.local.estado === "SUSPENDIDO") {
      return NextResponse.json({ error: "Servicio suspendido." }, { status: 402 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");

    const token = await new SignJWT({
      id:            usuario.id,
      email:         usuario.email,
      rol:           usuario.rol,
      localId:       usuario.localId,
      estadoLocal:   usuario.local?.estado || "ACTIVO",
      usuarioActivo: usuario.activo,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({ success: true, rol: usuario.rol });
    response.cookies.set("token", token, {
      path:     "/",
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24,
    });
    return response;

  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}