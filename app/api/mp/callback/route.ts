import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code    = searchParams.get("code");
  const localId = searchParams.get("state");

  if (!code || !localId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/admin/configuracion?mp=error`
    );
  }

  try {
    // Intercambiar code por access_token
    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        code,
        grant_type:    "authorization_code",
        redirect_uri:  `${process.env.NEXT_PUBLIC_URL}/api/mp/callback`,
      }),
    });

    if (!res.ok) {
      console.error("MP OAuth error:", await res.text());
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_URL}/admin/configuracion?mp=error`
      );
    }

    const { access_token, refresh_token, user_id } = await res.json();

    // Obtener email de la cuenta MP conectada
    const mpUserRes = await fetch(`https://api.mercadopago.com/users/${user_id}`, {
      headers: { "Authorization": `Bearer ${access_token}` },
    });
    const mpUser = mpUserRes.ok ? await mpUserRes.json() : {};

    // Guardar en el local
    await prisma.local.update({
      where: { id: Number(localId) },
      data: {
        mpAccessToken:  access_token,
        mpRefreshToken: refresh_token,
        mpUserId:       String(user_id),
        mpEmail:        mpUser.email ?? null,
        mpConectadoEn:  new Date(),
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/admin/configuracion?mp=conectado`
    );

  } catch (error) {
    console.error("Error callback MP:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_URL}/admin/configuracion?mp=error`
    );
  }
}