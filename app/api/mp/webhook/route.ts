import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // MP manda distintos tipos de eventos
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Consultar el pago a MP para verificar estado real
    // Usamos el token de la app (cualquier token válido sirve para consultar)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) return NextResponse.json({ ok: true });

    const payment = await mpRes.json();

    if (payment.status !== "approved") return NextResponse.json({ ok: true });

    // external_reference tiene el formato "sesion-{id}"
    const externalRef = payment.external_reference as string;
    if (!externalRef?.startsWith("sesion-")) return NextResponse.json({ ok: true });

    const sesionId = Number(externalRef.replace("sesion-", ""));

    await prisma.sesion.update({
      where: { id: sesionId },
      data:  { fechaFin: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook MP error:", error);
    return NextResponse.json({ ok: true }); // siempre 200 a MP
  }
}