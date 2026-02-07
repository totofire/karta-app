import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 🔍 LOG 1: Ver qué llega del formulario
    console.log("👉 INTENTO DE LOGIN:", { email, password });

    // 1. Buscamos al usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { local: true }
    });

    // 🔍 LOG 2: Ver si encontró algo en la base de datos
    console.log("👤 USUARIO ENCONTRADO EN BD:", usuario);

    // 2. Verificación simple de contraseña
    if (!usuario || usuario.password !== password) {
      console.log("❌ ERROR: Usuario no existe o contraseña incorrecta");
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // 3. Verificar estado del usuario y local
    if (!usuario.activo) {
      console.log("❌ ERROR: Usuario desactivado");
      return NextResponse.json({ error: "Usuario desactivado." }, { status: 403 });
    }

    if (usuario.local && usuario.local.estado === 'SUSPENDIDO') {
      console.log("❌ ERROR: Local suspendido");
      return NextResponse.json({ error: "Servicio suspendido." }, { status: 402 });
    }

    // 4. GENERAR TOKEN JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    
    const token = await new SignJWT({ 
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      localId: usuario.localId, 
      estadoLocal: usuario.local?.estado || 'ACTIVO',
      usuarioActivo: usuario.activo
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    console.log("✅ LOGIN EXITOSO: Token generado y guardando en cookies...");

    // 5. Guardar token en cookie
    const cookieStore = await cookies();
    cookieStore.set("token", token, { 
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 // 1 día
    });

    return NextResponse.json({ success: true, rol: usuario.rol });

  } catch (error) {
    console.error("🔥 ERROR CRÍTICO EN LOGIN:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}