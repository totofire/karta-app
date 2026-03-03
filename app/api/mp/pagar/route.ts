import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { tokenEfimero } = await req.json();

    if (!tokenEfimero) {
      return NextResponse.json({ error: "Falta token" }, { status: 400 });
    }

    // 1. Buscar sesión con pedidos activos + local para obtener su token MP
    const sesion = await prisma.sesion.findUnique({
      where: { tokenEfimero },
      include: {
        mesa: {
          include: {
            local: {
              select: { mpAccessToken: true, nombre: true },
            },
          },
        },
        pedidos: {
          where: { estado: { not: "CANCELADO" } },
          include: {
            items: { include: { producto: true } },
          },
        },
      },
    });

    if (!sesion) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
    }
    if (sesion.fechaFin) {
      return NextResponse.json({ error: "Mesa ya cerrada" }, { status: 410 });
    }

    // 2. Verificar que el local tiene MP conectado
    const mpToken = sesion.mesa.local.mpAccessToken;
    if (!mpToken) {
      return NextResponse.json(
        { error: "Este local no tiene Mercado Pago configurado" },
        { status: 400 }
      );
    }

    // 3. Agrupar ítems para la preferencia
    const mapaProductos = new Map<
      string,
      { title: string; quantity: number; unit_price: number }
    >();

    sesion.pedidos.forEach((pedido) => {
      pedido.items.forEach((item) => {
        const key = `${item.productoId}-${item.precio}`;
        if (mapaProductos.has(key)) {
          mapaProductos.get(key)!.quantity += item.cantidad;
        } else {
          mapaProductos.set(key, {
            title: item.producto.nombre,
            quantity: item.cantidad,
            unit_price: Number(item.precio),
          });
        }
      });
    });

    const itemsMP = Array.from(mapaProductos.values());

    if (itemsMP.length === 0) {
      return NextResponse.json(
        { error: "No hay ítems para cobrar" },
        { status: 400 }
      );
    }

    const total = itemsMP.reduce(
      (acc, i) => acc + i.unit_price * i.quantity,
      0
    );

    // 4. Crear preferencia en MP con el token del LOCAL
    const baseUrl = process.env.NEXT_PUBLIC_URL?.replace(/\/$/, "");

    const preference = {
      items: itemsMP,
      external_reference: `sesion-${sesion.id}`,
      statement_descriptor: sesion.mesa.local.nombre ?? "KARTA APP",
      back_urls: {
        success:  `${baseUrl}/mesa/${tokenEfimero}?pago=ok`,
        failure:  `${baseUrl}/mesa/${tokenEfimero}?pago=error`,
        pending:  `${baseUrl}/mesa/${tokenEfimero}?pago=pendiente`,
      },
      auto_return: "approved",
      metadata: {
        sesion_id:   sesion.id,
        mesa_nombre: sesion.mesa.nombre,
        token:       tokenEfimero,
      },
    };

    const mpRes = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpToken}`,
        },
        body: JSON.stringify(preference),
      }
    );

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error("Error MP preferences:", err);
      return NextResponse.json(
        { error: "Error al crear preferencia de pago" },
        { status: 500 }
      );
    }

    const data = await mpRes.json();

    // En producción usar init_point, en sandbox sandbox_init_point
    const esSandbox = mpToken.includes("TEST-");
    const checkoutUrl = esSandbox ? data.sandbox_init_point : data.init_point;

    return NextResponse.json({
      checkoutUrl,
      preferenceId: data.id,
      total,
    });
  } catch (error) {
    console.error("Error /api/mp/pagar:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}