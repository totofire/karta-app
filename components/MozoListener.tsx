"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { audioManager } from "@/lib/audio";
import { notificarNativo } from "@/lib/webNotify";
import { notify } from "@/lib/notify";
import { useRealtimeReconnect } from "@/hooks/useRealtimeReconnect";

interface Props {
  localId: number;
  mesasRef: React.MutableRefObject<any[]>;
  onUpdate: () => void;
  onPedidoListo: (mesaId: number, tipo: "cocina" | "barra" | "ambos") => void;
}

export default function MozoListener({ localId, mesasRef, onUpdate, onPedidoListo }: Props) {
  const onUpdateRef = useRef(onUpdate);
  const onPedidoListoRef = useRef(onPedidoListo);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onPedidoListoRef.current = onPedidoListo; }, [onPedidoListo]);

  useRealtimeReconnect({
    mutators: [onUpdate],
    onReconnect: () => onUpdateRef.current(),
  });

  const MOTIVO_LABEL: Record<string, string> = {
    SERVILLETAS: "Servilletas",
    ADEREZOS: "Aderezos / condimentos",
    CUBIERTOS: "Cubiertos / utensilios",
    CONSULTA: "Tiene una consulta",
    OTRO: "Necesita atención",
  };

  const pedidosNotif  = useRef<Set<number>>(new Set());
  const cuentasNotif  = useRef<Set<number>>(new Set());
  const llamadosNotif = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!localId) return;

    console.log(`[RT] Conectando postgres_changes mozo local-${localId}...`);

    const canal = supabase
      .channel(`mozo-${localId}`)

      /* ── 1. NUEVO PEDIDO ─────────────────────────────────── */
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "Pedido", filter: `localId=eq.${localId}` },
        (payload) => {
          const nuevo = payload.new as Record<string, any>;
          const pedidoId = nuevo.id as number;
          console.log("[RT] 📥 mozo pedido INSERT", nuevo);

          if (pedidosNotif.current.has(pedidoId)) return;
          pedidosNotif.current.add(pedidoId);
          setTimeout(() => pedidosNotif.current.delete(pedidoId), 10_000);

          onUpdateRef.current();
          audioManager.play("ding");
          navigator.vibrate?.([100, 50, 100]);
          const nombreCliente = (nuevo.nombreCliente as string) ?? "";
          notify.pedido("¡Nuevo pedido!", nombreCliente);
          notificarNativo("¡Nuevo pedido!", nombreCliente, `pedido-${pedidoId}`);
        }
      )

      /* ── 2. PEDIDO ACTUALIZADO (entregado / cancelado) ───── */
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "Pedido", filter: `localId=eq.${localId}` },
        async (payload) => {
          const nuevo = payload.new as Record<string, any>;
          console.log("[RT] 📥 mozo pedido UPDATE", nuevo);

          onUpdateRef.current();

          const estado    = nuevo.estado as string;
          const pedidoId  = nuevo.id as number;

          if (estado !== "ENTREGADO") return;

          try {
            const res = await fetch(`/api/mozo/pedido-listo?pedidoId=${pedidoId}`);
            if (!res.ok) return;
            const { mesaId, mesaNombre, tipo } = await res.json();

            audioManager.play("ding");
            navigator.vibrate?.([100, 50, 200]);
            notify.pedidoListo(mesaNombre, tipo);
            notificarNativo(
              tipo === "ambos" ? "¡Todo listo!" : tipo === "barra" ? "¡Bebida lista!" : "¡Plato listo!",
              `Mesa ${mesaNombre}`,
              `listo-${pedidoId}`,
            );
            onPedidoListoRef.current(mesaId, tipo);
          } catch { /* fetch failed, mutate ya corrió */ }
        }
      )

      /* ── 3. PEDIDO ELIMINADO ─────────────────────────────── */
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "Pedido", filter: `localId=eq.${localId}` },
        () => { onUpdateRef.current(); }
      )

      /* ── 4. CAMBIOS DE MESA ──────────────────────────────── */
      .on("postgres_changes",
        { event: "*", schema: "public", table: "Mesa", filter: `localId=eq.${localId}` },
        () => { onUpdateRef.current(); }
      )

      /* ── 5. CAMBIOS DE SESIÓN (cuenta / llamado) ─────────── */
      .on("postgres_changes",
        { event: "*", schema: "public", table: "Sesion", filter: `localId=eq.${localId}` },
        (payload) => {
          onUpdateRef.current();
          if (payload.eventType !== "UPDATE") return;

          const nuevo  = payload.new as Record<string, any>;
          const viejo  = payload.old as Record<string, any>;

          // Nuevo llamado al mozo (valor cambió de null/distinto a string)
          const llamadaMozo         = nuevo.llamadaMozo as string | null;
          const llamadaMozoAnterior = viejo.llamadaMozo as string | null;
          if (llamadaMozo && llamadaMozo !== llamadaMozoAnterior) {
            const keyLlamado = (nuevo.mesaId as number) ?? 0;
            if (!llamadosNotif.current.has(keyLlamado)) {
              llamadosNotif.current.add(keyLlamado);
              setTimeout(() => llamadosNotif.current.delete(keyLlamado), 15_000);
              const nombreMesa  = mesasRef.current.find((m) => m.id === nuevo.mesaId)?.nombre ?? `#${keyLlamado}`;
              const motivoTexto = MOTIVO_LABEL[llamadaMozo] ?? "Necesita atención";
              audioManager.play("ding");
              navigator.vibrate?.([200, 100, 200]);
              notify.atencion("¡Te llaman!", `Mesa ${nombreMesa} — ${motivoTexto}`);
              notificarNativo("¡Te llaman!", `Mesa ${nombreMesa} — ${motivoTexto}`, `llamado-${keyLlamado}`);
            }
          }

          // Nueva solicitud de cuenta (null → Date)
          if (nuevo.solicitaCuenta && !viejo.solicitaCuenta) {
            const key = (nuevo.mesaId as number) ?? 0;
            if (!cuentasNotif.current.has(key)) {
              cuentasNotif.current.add(key);
              setTimeout(() => cuentasNotif.current.delete(key), 15_000);
              const nombreMesa =
                mesasRef.current.find((m) => m.id === nuevo.mesaId)?.nombre ?? `#${key}`;
              audioManager.play("caja");
              navigator.vibrate?.([300, 100, 300]);
              notify.atencion("¡Piden la cuenta!", `Mesa ${nombreMesa}`);
              notificarNativo("¡Piden la cuenta!", `Mesa ${nombreMesa}`, `cuenta-${key}`);
            }
          }
        }
      )

      .subscribe((status, err) => {
        console.log(`[RT] mozo local-${localId} status: ${status}`, err || "");
        if (status === "SUBSCRIBED") {
          console.log(`[RT] ✅ mozo local-${localId} activo — ${new Date().toISOString()}`);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[RT] ❌ mozo ${status}:`, err);
        }
      });

    return () => { supabase.removeChannel(canal); };
  }, [localId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
