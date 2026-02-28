import { NextResponse } from "next/server";
import { getLocalId } from "@/lib/auth";

export async function GET(req: Request) {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mpAuthUrl = new URL("https://auth.mercadopago.com/authorization");
  mpAuthUrl.searchParams.set("client_id",     process.env.MP_CLIENT_ID!);
  mpAuthUrl.searchParams.set("response_type", "code");
  mpAuthUrl.searchParams.set("platform_id",   "mp");
  mpAuthUrl.searchParams.set("redirect_uri",  `${process.env.NEXT_PUBLIC_URL}/api/mp/callback`);
  mpAuthUrl.searchParams.set("state",         String(localId)); // para saber qué local conectó

  return NextResponse.redirect(mpAuthUrl.toString());
}