"use client";

/**
 * MozoListener — canal único Supabase Realtime para el panel del mozo.
 *
 * Escucha, filtrado por localId:
 *  • INSERT Pedido  → nuevo pedido de cliente  (ding + toast + notificación OS)
 *  • UPDATE Pedido  → pedido entregado por cocina/barra (ding + toast + OS)
 *  • *      Mesa    → mesa abierta/cerrada      (mutate)
 *  • INSERT Sesion  → sesión nueva              (mutate)
 *  • UPDATE Sesion  → solicitaCuenta / cierre   (caja + toast + OS si pide cuenta)
 *
 * Todas las notificaciones se disparan DIRECTAMENTE desde el callback WebSocket,
 * sin pasar por SWR diff, para funcionar aunque el tab esté en background.
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { audioManager } from "@/lib/audio";
import { notificarNativo } from "@/lib/webNotify";
import { notify } from "@/lib/notify";
import type { PedidoPayload, SesionPayload } from "@/lib/supabase-types";

interface Props {
  localId: number;
  /** Ref a la lista de mesas actual (para obtener nombres en callbacks) */
  mesasRef: React.MutableRefObject<any[]>;
  onUpdate: () => void;
  onPedidoListo: (mesaId: number, tipo: "cocina" | "barra" | "ambos") => void;
}

export default function MozoListener({ localId, mesasRef, onUpdate, onPedidoListo }: Props) {
  const onUpdateRef = useRef(onUpdate);
  const onPedidoListoRef = useRef(onPedidoListo);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { onPedidoListoRef.current = onPedidoListo; }, [onPedidoListo]);

  // Sets para evitar notificaciones duplicadas
  const pedidosNotif = useRef<Set<number>>(new Set());
  const cuentasNotif = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!localId) return;

    const canal = supabase
      .channel(`mozo-all-${localId}`)

      /* ── 1. NUEVO PEDIDO ─────────────────────────────────── */
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedido", filter: `localId=eq.${localId}` },
        (payload) => {
          const p = payload.new as PedidoPayload;
          if (!p.id) return;
          if (pedidosNotif.current.has(p.id)) return;
          pedidosNotif.current.add(p.id);
          setTimeout(() => pedidosNotif.current.delete(p.id!), 10_000);

          onUpdateRef.current();
          audioManager.play("ding");
          navigator.vibrate?.([100, 50, 100]);
          notify.pedido("¡Nuevo pedido!", p.nombreCliente ?? "");
          notificarNativo("¡Nuevo pedido!", p.nombreCliente ?? "", `pedido-${p.id}`);
        },
      )

      /* ── 2. PEDIDO ENTREGADO (cocina/barra listo) ─────────── */
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedido", filter: `localId=eq.${localId}` },
        async (payload) => {
          const n = payload.new as PedidoPayload;
          const o = payload.old as PedidoPayload;

          onUpdateRef.current();

          if (n.estado !== "ENTREGADO" || o.estado === "ENTREGADO") return;
          if (!n.id) return;

          try {
            const res = await fetch(`/api/mozo/pedido-listo?pedidoId=${n.id}`);
            if (!res.ok) return;
            const { mesaId, mesaNombre, tipo } = await res.json();

            audioManager.play("ding");
            navigator.vibrate?.([100, 50, 200]);
            notify.pedidoListo(mesaNombre, tipo);
            notificarNativo(
              tipo === "ambos" ? "¡Todo listo!" : tipo === "barra" ? "¡Bebida lista!" : "¡Plato listo!",
              `Mesa ${mesaNombre}`,
              `listo-${n.id}`,
            );
            onPedidoListoRef.current(mesaId, tipo);
          } catch {}
        },
      )

      /* ── 3. CAMBIOS DE MESA ───────────────────────────────── */
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Mesa", filter: `localId=eq.${localId}` },
        () => { onUpdateRef.current(); },
      )

      /* ── 4. SESIÓN NUEVA ─────────────────────────────────── */
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sesion", filter: `localId=eq.${localId}` },
        () => { onUpdateRef.current(); },
      )

      /* ── 5. SESIÓN ACTUALIZADA (cuenta / cierre) ─────────── */
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sesion", filter: `localId=eq.${localId}` },
        (payload) => {
          const n = payload.new as SesionPayload;
          const o = payload.old as SesionPayload;

          onUpdateRef.current();

          // Detectar solicitud de cuenta nueva
          if (!n.solicitaCuenta || o.solicitaCuenta) return;

          const key = n.mesaId ?? 0;
          if (cuentasNotif.current.has(key)) return;
          cuentasNotif.current.add(key);
          setTimeout(() => cuentasNotif.current.delete(key), 15_000);

          // Buscar nombre de mesa en los datos cacheados
          const nombreMesa =
            mesasRef.current.find((m) => m.id === n.mesaId)?.nombre ?? `#${key}`;

          audioManager.play("caja");
          navigator.vibrate?.([300, 100, 300]);
          notify.atencion("¡Piden la cuenta!", `Mesa ${nombreMesa}`);
          notificarNativo("¡Piden la cuenta!", `Mesa ${nombreMesa}`, `cuenta-${key}`);
        },
      )

      .subscribe((status) => {
        console.log(`[MozoListener] ${status}`);
      });

    return () => { supabase.removeChannel(canal); };
  }, [localId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
