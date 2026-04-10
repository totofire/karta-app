const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface BroadcastEvent {
  channel: string;
  event: string;
  payload?: Record<string, unknown>;
}

export async function broadcast({ channel, event, payload = {} }: BroadcastEvent) {
  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `realtime:${channel}`,
            event: "broadcast",
            payload: { type: "broadcast", event, ...payload },
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[Broadcast] Error:", err);
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
