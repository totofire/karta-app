import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 1. Obtenemos la cookie de sesión
  const sesion = request.cookies.get("admin_session");
  const url = request.nextUrl.clone();

  // 2. Si intenta entrar al admin O a la cocina y NO tiene sesión...
  if ((url.pathname.startsWith("/admin") || url.pathname.startsWith("/cocina")) && !sesion) {
    // ...lo mandamos al login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Si ya tiene sesión y quiere ir al login...
  if (url.pathname === "/login" && sesion) {
    // ...lo mandamos directo al admin (ya está logueado)
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

// Configuración: A qué rutas afecta este patovica
export const config = {
  matcher: ["/admin/:path*", "/cocina/:path*", "/login"],
};