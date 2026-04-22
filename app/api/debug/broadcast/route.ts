import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint temporal de diagnóstico para Broadcast.
 * Llamá GET /api/debug/broadcast desde el browser y revisá la respuesta JSON
 * junto con la consola del server (terminal de next dev / logs de Vercel).
 *
 * BORRAR este archivo cuando el bug esté resuelto.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const urlPreview = url ? url.slice(0, 40) : "MISSING";
  const keyPreview = key ? key.slice(0, 20) : "MISSING";

  console.log(`[debug/broadcast] NEXT_PUBLIC_SUPABASE_URL present=${!!url} preview=${urlPreview}...`);
  console.log(`[debug/broadcast] SUPABASE_SERVICE_ROLE_KEY present=${!!key} preview=${keyPreview}...`);

  if (!url || !key) {
    return NextResponse.json(
      {
        error: "Variables de entorno faltantes",
        NEXT_PUBLIC_SUPABASE_URL_present: !!url,
        SUPABASE_SERVICE_ROLE_KEY_present: !!key,
      },
      { status: 500 },
    );
  }

  const targetUrl = `${url}/realtime/v1/api/broadcast`;
  const channel = "local-16";
  const requestBody = {
    messages: [
      {
        topic: `realtime:${channel}`,
        event: "broadcast",
        payload: {
          type: "broadcast",
          event: "pedido:insert",
          test: true,
          timestamp: Date.now(),
        },
      },
    ],
  };

  console.log(`[debug/broadcast] POST ${targetUrl} body=${JSON.stringify(requestBody)}`);

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    console.error("[debug/broadcast] Error de red:", err);
    return NextResponse.json(
      {
        error: "Error de red al llamar Supabase",
        detail: String(err),
        targetUrl,
      },
      { status: 500 },
    );
  }

  const body = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, name) => { headers[name] = value; });

  console.log(`[debug/broadcast] Supabase respondió ${response.status} ${response.statusText} | body=${body}`);

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL_preview: `${urlPreview}...`,
      SUPABASE_SERVICE_ROLE_KEY_preview: `${keyPreview}...`,
    },
    request: {
      url: targetUrl,
      channel,
      event_outer: "broadcast",
      event_inner: "pedido:insert",
      body: requestBody,
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers,
      body,
    },
  });
}
