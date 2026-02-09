import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  // 1. Obtener el token de la cookie
  const token = request.cookies.get("token")?.value;
  const path = request.nextUrl.pathname;

  // 2. Definir rutas protegidas
  const esRutaAdmin = path.startsWith("/admin");
  const esRutaMozo = path.startsWith("/mozo");
  const esRutaCocina = path.startsWith("/cocina");
  const esRutaBarra = path.startsWith("/barra");

  const esRutaProtegida = esRutaAdmin || esRutaMozo || esRutaCocina || esRutaBarra;

  // 3. Si es ruta protegida y NO hay token, mandar al login
  if (esRutaProtegida && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Si hay token, lo validamos y verificamos roles
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
      const { payload } = await jwtVerify(token, secret);
      
      const rol = payload.rol as string; // Asumimos que guardaste el rol en el token

      // --- CASO A: Usuario logueado intentando entrar al Login ---
      if (path === "/login") {
        if (rol === "ADMIN" || rol === "SUPER_ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
        if (rol === "MOZO") return NextResponse.redirect(new URL("/mozo", request.url));
        if (rol === "COCINA") return NextResponse.redirect(new URL("/cocina", request.url));
        if (rol === "BARRA") return NextResponse.redirect(new URL("/barra", request.url));
      }

      // --- CASO B: Protección de Roles (Seguridad) ---
      
      // Si un MOZO intenta entrar al ADMIN -> Lo mandamos a /mozo
      if (esRutaAdmin && rol === "MOZO") {
        return NextResponse.redirect(new URL("/mozo", request.url));
      }

      // Si un ADMIN intenta entrar a cosas de MOZO -> Lo dejamos (o podrías bloquearlo si quieres)
      // Generalmente el Admin tiene permiso de "Superusuario", así que lo dejamos pasar.

      // Si COCINA intenta entrar a ADMIN o MOZO -> Lo mandamos a /cocina
      if ((esRutaAdmin || esRutaMozo) && rol === "COCINA") {
        return NextResponse.redirect(new URL("/cocina", request.url));
      }

    } catch (error) {
      // Si el token es inválido o expiró, lo borramos y mandamos al login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

// Configuración: A qué rutas aplica
export const config = {
  // Agregué /mozo aquí para que el middleware lo intercepte
  matcher: ["/admin/:path*", "/cocina/:path*", "/barra/:path*", "/mozo/:path*", "/login"],
};