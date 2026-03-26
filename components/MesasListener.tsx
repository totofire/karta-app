'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface MesasListenerProps {
  localId: number;
  onUpdate: () => void;
}

/**
 * Escucha cambios en las tablas Mesa y Sesion filtrados por localId.
 * Al detectar cualquier INSERT/UPDATE/DELETE llama a onUpdate() para
 * que SWR refresque los datos sin polling.
 */
export default function MesasListener({ localId, onUpdate }: MesasListenerProps) {
  // Ref estable para no recrear el canal si onUpdate cambia de referencia
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!localId) return;

    const canal = supabase
      .channel(`mesas-listener-${localId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Mesa', filter: `localId=eq.${localId}` },
        () => {
          console.log('[MesasListener] Mesa cambió');
          onUpdateRef.current();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sesion', filter: `localId=eq.${localId}` },
        () => {
          console.log('[MesasListener] Sesion cambió');
          onUpdateRef.current();
        },
      )
      .subscribe((status) => {
        console.log(`[MesasListener] Estado: ${status}`);
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [localId]);

  return null;
}
