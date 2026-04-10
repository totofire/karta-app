"use client";

/**
 * MozoListener — canal broadcast Supabase Realtime para el panel del mozo.
 *
 * Escucha broadcasts en canal `local-{localId}`:
 *  • pedido:insert  → nuevo pedido de cliente  (ding + toast + notificación OS)
 *  • pedido:update  → pedido entregado por cocina/barra (ding + toast + OS)
 *  • mesa:*         → mesa abierta/cerrada      (mutate)
 *  • sesion:insert  → sesión nueva              (mutate)
 *  • sesion:update  → solicitaCuenta / llamadaMozo / cierre (caja + toast + OS)
 */

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

  const pedidosNotif = useRef<Set<number>>(new Set());
  const cuentasNotif = useRef<Set<number>>(new Set());
  const llamadosNotif = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!localId) return;

    console.log(`[RT] Conectando broadcast mozo local-${localId}...`);

    const canal = supabase
      .channel(`local-${localId}-mozo`)

      /* ── 1. NUEVO PEDIDO ─────────────────────────────────── */
      .on("broadcast", { event: "pedido:insert" }, (msg) => {
        const p = msg.payload as Record<string, any>;
        console.log("[RT] 📥 mozo pedido:insert", p);

        const pedidoId = p?.pedidoId as number | undefined;
        if (!pedidoId) return;
        if (pedidosNotif.current.has(pedidoId)) return;
        pedidosNotif.current.add(pedidoId);
        setTimeout(() => pedidosNotif.current.delete(pedidoId), 10_000);

        onUpdateRef.current();
        audioManager.play("ding");
        navigator.vibrate?.([100, 50, 100]);
        notify.pedido("¡Nuevo pedido!", (p?.nombreCliente as string) ?? "");
        notificarNativo("¡Nuevo pedido!", (p?.nombreCliente as string) ?? "", `pedido-${pedidoId}`);
      })

      /* ── 2. PEDIDO ACTUALIZADO (entregado / cancelado) ───── */
      .on("broadcast", { event: "pedido:update" }, async (msg) => {
        const data = msg.payload as Record<string, any>;
        console.log("[RT] 📥 mozo pedido:update", data);

        onUpdateRef.current();

        const estado = data?.estado as string | undefined;
        const pedidoId = data?.pedidoId as number | undefined;

        if (estado !== "ENTREGADO" || !pedidoId) return;

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
      })

      /* ── 3. PEDIDO ELIMINADO ─────────────────────────────── */
      .on("broadcast", { event: "pedido:delete" }, () => {
        onUpdateRef.current();
      })

      /* ── 4. CAMBIOS DE MESA ──────────────────────────────── */
      .on("broadcast", { event: "mesa:insert" }, () => { onUpdateRef.current(); })
      .on("broadcast", { event: "mesa:update" }, () => { onUpdateRef.current(); })
      .on("broadcast", { event: "mesa:delete" }, () => { onUpdateRef.current(); })

      /* ── 5. SESIÓN NUEVA ─────────────────────────────────── */
      .on("broadcast", { event: "sesion:insert" }, () => { onUpdateRef.current(); })

      /* ── 6. SESIÓN ACTUALIZADA (cuenta / llamado / cierre) ─ */
      .on("broadcast", { event: "sesion:update" }, (msg) => {
        const data = msg.payload as Record<string, any>;
        console.log("[RT] 📥 mozo sesion:update", data);

        onUpdateRef.current();

        // Detectar llamado al mozo
        const llamadaMozo = data?.llamadaMozo as string | null | undefined;
        if (llamadaMozo) {
          const keyLlamado = (data?.mesaId as number) ?? 0;
          if (!llamadosNotif.current.has(keyLlamado)) {
            llamadosNotif.current.add(keyLlamado);
            setTimeout(() => llamadosNotif.current.delete(keyLlamado), 15_000);
            const nombreMesa = mesasRef.current.find((m) => m.id === data?.mesaId)?.nombre ?? `#${keyLlamado}`;
            const motivoTexto = MOTIVO_LABEL[llamadaMozo] ?? "Necesita atención";
            audioManager.play("ding");
            navigator.vibrate?.([200, 100, 200]);
            notify.atencion("¡Te llaman!", `Mesa ${nombreMesa} — ${motivoTexto}`);
            notificarNativo("¡Te llaman!", `Mesa ${nombreMesa} — ${motivoTexto}`, `llamado-${keyLlamado}`);
          }
        }

        // Detectar solicitud de cuenta
        if (!data?.solicitaCuenta) return;
        const key = (data?.mesaId as number) ?? 0;
        if (cuentasNotif.current.has(key)) return;
        cuentasNotif.current.add(key);
        setTimeout(() => cuentasNotif.current.delete(key), 15_000);

        const nombreMesa =
          mesasRef.current.find((m) => m.id === data?.mesaId)?.nombre ?? `#${key}`;

        audioManager.play("caja");
        navigator.vibrate?.([300, 100, 300]);
        notify.atencion("¡Piden la cuenta!", `Mesa ${nombreMesa}`);
        notificarNativo("¡Piden la cuenta!", `Mesa ${nombreMesa}`, `cuenta-${key}`);
      })

      .on("broadcast", { event: "sesion:delete" }, () => { onUpdateRef.current(); })

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
