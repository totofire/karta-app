import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // Eliminamos la cookie de sesión
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");

  // Redirigimos al login
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_URL || "http://localhost:3000"));
}