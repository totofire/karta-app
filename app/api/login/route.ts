import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers"; // Para guardar la sesión

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // 1. Buscamos al usuario
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  // 2. Verificamos contraseña (simple por ahora)
  if (!usuario || usuario.password !== password) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  // 3. ¡Login Exitoso! Guardamos una cookie simple
  // En un app real usaríamos JWT, pero para este MVP esto alcanza
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "true", { 
    path: "/",
    httpOnly: true, // Más seguridad
    maxAge: 60 * 60 * 24 // 1 día
  });

  return NextResponse.json({ success: true, rol: usuario.rol });
}