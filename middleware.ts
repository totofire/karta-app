import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const path  = request.nextUrl.pathname;

  // ── Rutas protegidas ─────────────────────────────────────────────
  const esRutaAdmin      = path.startsWith("/admin");
  const esRutaMozo       = path.startsWith("/mozo");
  const esRutaCocina     = path.startsWith("/cocina");
  const esRutaBarra      = path.startsWith("/barra");
  const esRutaSuperAdmin = path.startsWith("/superadmin");

  const esRutaProtegida = esRutaAdmin || esRutaMozo || esRutaCocina || esRutaBarra || esRutaSuperAdmin;

  // Sin token en ruta protegida → login
  if (esRutaProtegida && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
      const { payload } = await jwtVerify(token, secret);
      const rol = payload.rol as string;

      // ── CASO A: Ya logueado intentando entrar al login ────────────
      if (path === "/login") {
        if (rol === "SUPER_ADMIN")  return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
        if (rol === "ADMIN")        return NextResponse.redirect(new URL("/admin", request.url));
        if (rol === "MOZO")         return NextResponse.redirect(new URL("/mozo", request.url));
        if (rol === "COCINA")       return NextResponse.redirect(new URL("/cocina", request.url));
        if (rol === "BARRA")        return NextResponse.redirect(new URL("/barra", request.url));
      }

      // ── CASO B: Protección del panel SUPER_ADMIN ──────────────────
      // Solo SUPER_ADMIN puede entrar a /superadmin
      if (esRutaSuperAdmin && rol !== "SUPER_ADMIN") {
        if (rol === "ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
        if (rol === "MOZO")  return NextResponse.redirect(new URL("/mozo", request.url));
        return NextResponse.redirect(new URL("/login", request.url));
      }

      // SUPER_ADMIN no debería estar en paneles de locales
      if (rol === "SUPER_ADMIN" && (esRutaAdmin || esRutaMozo || esRutaCocina || esRutaBarra)) {
        return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
      }

      // ── CASO C: Protección de roles existentes ────────────────────
      // MOZO no puede entrar al panel de ADMIN
      if (esRutaAdmin && rol === "MOZO") {
        return NextResponse.redirect(new URL("/mozo", request.url));
      }

      // COCINA no puede entrar a ADMIN ni MOZO
      if ((esRutaAdmin || esRutaMozo) && rol === "COCINA") {
        return NextResponse.redirect(new URL("/cocina", request.url));
      }

    } catch {
      // Token inválido o expirado → borrar y mandar al login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
    "/cocina/:path*",
    "/barra/:path*",
    "/mozo/:path*",
    "/login",
  ],
};