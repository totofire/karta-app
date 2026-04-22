const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface BroadcastEvent {
  channel: string;
  event: string;
  payload?: Record<string, unknown>;
}

interface BroadcastResult {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  url: string;
  requestBody: unknown;
}

export async function broadcast({ channel, event, payload = {} }: BroadcastEvent): Promise<BroadcastResult | null> {
  const keyPresent = !!SUPABASE_SERVICE_KEY;
  const keyPreview = SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY.slice(0, 20) : "MISSING";
  const urlPresent = !!SUPABASE_URL;
  const urlPreview = SUPABASE_URL ? SUPABASE_URL.slice(0, 40) : "MISSING";

  console.log(`[Broadcast] → channel="${channel}" event="${event}" | URL=${urlPreview}... | SERVICE_KEY present=${keyPresent} preview=${keyPreview}...`);

  if (!keyPresent) {
    console.error("[Broadcast] ❌ SUPABASE_SERVICE_ROLE_KEY no está definida. Agregala en .env y reiniciá el server.");
    return null;
  }

  const url = `${SUPABASE_URL}/realtime/v1/api/broadcast`;
  const requestBody = {
    messages: [
      {
        topic: `realtime:${channel}`,
        event: "broadcast",
        payload: { event, payload },
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const body = await response.text();

    const result: BroadcastResult = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body,
      url,
      requestBody,
    };

    if (!response.ok) {
      console.error(`[Broadcast] ❌ Supabase respondió ${response.status} ${response.statusText} | body=${body}`);
    } else {
      console.log(`[Broadcast] ✅ ${response.status} ${response.statusText} | body=${body}`);
    }

    return result;
  } catch (err) {
    console.error("[Broadcast] Error de red:", err);
    return null;
  }
}

export function broadcastPedido(localId: number, action: "insert" | "update" | "delete", data?: Record<string, unknown>) {
  return broadcast({ channel: `local-${localId}`, event: `pedido:${action}`, payload: data });
}

export function broadcastSesion(localId: number, action: "insert" | "update" | "delete", data?: Record<string, unknown>) {
  return broadcast({ channel: `local-${localId}`, event: `sesion:${action}`, payload: data });
}

export function broadcastMesa(localId: number, action: "insert" | "update" | "delete", data?: Record<string, unknown>) {
  return broadcast({ channel: `local-${localId}`, event: `mesa:${action}`, payload: data });
}

export function broadcastConfig(localId: number) {
  return broadcast({ channel: `local-${localId}`, event: "config:update" });
}

export function broadcastCliente(sesionId: number, action: string, data?: Record<string, unknown>) {
  return broadcast({ channel: `sesion-${sesionId}`, event: `pedido:${action}`, payload: data });
}
