"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface UseRealtimeReconnectOptions {
  /** Funciones mutate de SWR que se invocan al reconectar */
  mutators: Array<() => void>;
  /** Callback opcional cuando se detecta reconexión necesaria */
  onReconnect?: () => void;
}

/**
 * Hook centralizado de reconexión Realtime.
 *
 * Escucha `visibilitychange` y `online`:
 * - Si el WebSocket está desconectado → limpia canales y notifica via onReconnect.
 * - Si está conectado (pero pudo perder eventos en background) → revalida SWR como safety net.
 */
export function useRealtimeReconnect({ mutators, onReconnect }: UseRealtimeReconnectOptions) {
  const mutatorsRef = useRef(mutators);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => { mutatorsRef.current = mutators; }, [mutators]);
  useEffect(() => { onReconnectRef.current = onReconnect; }, [onReconnect]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const connected = supabase.realtime.isConnected();
      console.log(`[RT] visibilitychange → visible | WS connected: ${connected} — ${new Date().toISOString()}`);

      if (!connected) {
        console.warn("[RT] WebSocket desconectado, forzando reconexión...");
        supabase.realtime.connect();
        onReconnectRef.current?.();
      }

      // Safety net: revalidar SWR aunque esté conectado,
      // porque pudieron perderse eventos mientras el tab estaba en background.
      mutatorsRef.current.forEach((m) => m());
    };

    const handleOnline = () => {
      console.log(`[RT] online event — ${new Date().toISOString()}`);
      const connected = supabase.realtime.isConnected();

      if (!connected) {
        console.warn("[RT] Red recuperada pero WS muerto, reconectando...");
        supabase.realtime.connect();
        onReconnectRef.current?.();
      }

      mutatorsRef.current.forEach((m) => m());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
