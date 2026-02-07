import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  // 1. Obtener el token de la cookie
  const token = request.cookies.get("token")?.value;

  // 2. Definir rutas protegidas
  const esRutaProtegida = 
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/cocina") ||
    request.nextUrl.pathname.startsWith("/barra");

  // 3. Si es ruta protegida y NO hay token, mandar al login
  if (esRutaProtegida && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Si hay token, intentamos validarlo (Seguridad extra)
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
      await jwtVerify(token, secret);
      // Si pasa, el token es válido
      
      // (Opcional) Si estás en /login y ya tenés token válido, mandar al admin
      if (request.nextUrl.pathname === "/login") {
        return NextResponse.redirect(new URL("/admin", request.url));
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
  matcher: ["/admin/:path*", "/cocina/:path*", "/barra/:path*", "/login"],
};