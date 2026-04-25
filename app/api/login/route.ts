import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const step = (label: string, data?: unknown) =>
    console.log(`[LOGIN] ${label}`, data !== undefined ? JSON.stringify(data) : "");

  try {
    step("→ REQUEST recibido");

    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch (e) {
      step("ERROR parseando body", String(e));
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { email, password } = body;
    step("email recibido", email);
    step("password presente", !!password);

    if (!email || !password) {
      step("ERROR campos vacíos");
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    step("buscando usuario en DB...");
    let usuario;
    try {
      usuario = await prisma.usuario.findUnique({
        where: { email },
        include: { local: true },
      });
    } catch (e) {
      step("ERROR Prisma findUnique", String(e));
      return NextResponse.json({ error: "Error de base de datos" }, { status: 500 });
    }

    step("usuario encontrado", !!usuario);
    if (usuario) {
      step("usuario.activo", usuario.activo);
      step("usuario.rol", usuario.rol);
      step("usuario.localId", usuario.localId);
      step("password hash presente", !!usuario.password);
    }

    let passwordValida = false;
    if (usuario?.password) {
      try {
        passwordValida = await bcrypt.compare(password, usuario.password);
        step("bcrypt.compare resultado", passwordValida);
      } catch (e) {
        step("ERROR bcrypt.compare", String(e));
        return NextResponse.json({ error: "Error verificando contraseña" }, { status: 500 });
      }
    } else {
      step("sin hash de password — saltando bcrypt");
    }

    if (!usuario || !passwordValida) {
      step("RECHAZADO — credenciales inválidas");
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (!usuario.activo) {
      step("RECHAZADO — usuario inactivo");
      return NextResponse.json({ error: "Usuario desactivado." }, { status: 403 });
    }

    if (usuario.local && usuario.local.estado === "SUSPENDIDO") {
      step("RECHAZADO — local suspendido");
      return NextResponse.json({ error: "Servicio suspendido." }, { status: 402 });
    }

    step("generando JWT...");
    const jwtSecretEnv = process.env.JWT_SECRET;
    step("JWT_SECRET presente", !!jwtSecretEnv);

    const secret = new TextEncoder().encode(jwtSecretEnv || "secret");

    let token: string;
    try {
      token = await new SignJWT({
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
      step("JWT generado OK, longitud", token.length);
    } catch (e) {
      step("ERROR generando JWT", String(e));
      return NextResponse.json({ error: "Error generando token" }, { status: 500 });
    }

    step("construyendo response con cookie...");
    const response = NextResponse.json({ success: true, rol: usuario.rol });
    response.cookies.set("token", token, {
      path:     "/",
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24,
    });

    step("NODE_ENV", process.env.NODE_ENV);
    step("✓ LOGIN OK — rol", usuario.rol);
    return response;

  } catch (error) {
    console.error("[LOGIN] ERROR NO CAPTURADO:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
