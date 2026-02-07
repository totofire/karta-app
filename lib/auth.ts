import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function getLocalId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);

    // Aseguramos que sea un número
    const lid = payload.localId;
    if (lid === null || lid === undefined) return null;
    
    return Number(lid);
  } catch (error) {
    console.error("Error verificando token:", error);
    return null;
  }
}