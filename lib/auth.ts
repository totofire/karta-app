import { cookies } from "next/headers";
import { jwtVerify } from "jose";

interface Session {
  userId:   number;
  localId:  number | null;
  rol:      string;
}

// Devuelve la sesión completa del token (userId, localId, rol)
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
    const { payload } = await jwtVerify(token, secret);

    const userId  = payload.id;
    const localId = payload.localId;
    const rol     = payload.rol;

    if (!userId || !rol) return null;

    return {
      userId:  Number(userId),
      localId: localId != null ? Number(localId) : null,
      rol:     String(rol),
    };
  } catch (error) {
    console.error("Error verificando token:", error);
    return null;
  }
}

// Helper legacy — mantiene compatibilidad con rutas existentes
export async function getLocalId(): Promise<number | null> {
  const session = await getSession();
  return session?.localId ?? null;
}

// Helper para rutas que requieren SUPER_ADMIN
export async function getSuperAdmin(): Promise<Session | null> {
  const session = await getSession();
  if (!session || session.rol !== "SUPER_ADMIN") return null;
  return session;
}