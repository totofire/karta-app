import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  
  // CORRECCIÓN: Borrar "token", que es como la llamaste en el login
  cookieStore.delete("token");

  // Opcional: Para asegurar que se borre, a veces ayuda setearla como expirada
  // cookieStore.set("token", "", { maxAge: 0 }); 

  // Redirigimos al login usando la URL base de la petición actual (más seguro que process.env)
  return NextResponse.redirect(new URL("/login", request.url));
}