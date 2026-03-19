'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { Ban, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KDSListenerProps {
  sector: 'cocina' | 'barra';
  mutate: () => void;
  canceladosPorAdmin: React.MutableRefObject<Set<number>>;
}

const fetcherMe = (url: string) => fetch(url).then(r => r.ok ? r.json() : null);

/**
 * Listener de Supabase Realtime para las páginas KDS (Cocina y Barra).
 * Extrae la lógica duplicada de ambas páginas:
 *  - Canal Pedido filtrado por localId
 *  - Toast de cancelación total
 *  - Toast de comanda modificada (cancelación parcial)
 *  - mutate() para refrescar SWR
 *
 * Elimina la necesidad de crear canales directamente en cada página KDS,
 * evitando el triple-canal cuando el admin layout ya escucha Pedido.
 */
export default function KDSListener({ sector, mutate, canceladosPorAdmin }: KDSListenerProps) {
  const { data: me } = useSWR('/api/auth/me', fetcherMe, { revalidateOnFocus: false });
  const localId: number | null = me?.localId ?? null;

  // Refs estables para no recrear el canal cuando cambian las funciones
  const mutateRef       = useRef(mutate);
  const canceladosRef   = useRef(canceladosPorAdmin);
  useEffect(() => { mutateRef.current     = mutate;            }, [mutate]);
  useEffect(() => { canceladosRef.current = canceladosPorAdmin; }, [canceladosPorAdmin]);

  useEffect(() => {
    if (!localId) return;

    console.log(`🔌 [KDSListener] Conectando canal kds-${sector}-${localId}...`);

    const canal = supabase
      .channel(`kds-${sector}-${localId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Pedido', filter: `localId=eq.${localId}` },
        (payload) => {
          const newRecord = payload.new as { id?: number; estado?: string; impreso?: boolean };
          const oldRecord = payload.old as { id?: number; estado?: string; impreso?: boolean };

          // Cancelación total por alguien externo a este KDS
          if (
            payload.eventType === 'UPDATE' &&
            newRecord.estado === 'CANCELADO' &&
            oldRecord.estado !== 'CANCELADO' &&
            newRecord.id !== undefined &&
            !canceladosRef.current.current.has(newRecord.id)
          ) {
            toast.custom((t) => (
              <div
                onClick={() => toast.dismiss(t.id)}
                className={`${
                  t.visible ? 'animate-in fade-in slide-in-from-top-5' : 'animate-out fade-out slide-out-to-top-5'
                } max-w-sm w-full bg-white shadow-2xl rounded-2xl cursor-pointer pointer-events-auto ring-1 ring-red-200 border-l-4 border-red-500 overflow-hidden`}
              >
                <div className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Ban size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900">Pedido cancelado</p>
                    <p className="text-xs text-gray-500 mt-0.5">El cliente canceló un pedido</p>
                  </div>
                </div>
              </div>
            ), { duration: 6000, position: 'top-center' });
          }

          // Cancelación parcial: ítems removidos, pedido sigue en PENDIENTE
          if (
            payload.eventType === 'UPDATE' &&
            newRecord.estado === 'PENDIENTE' &&
            oldRecord.impreso === true &&
            newRecord.impreso === false &&
            newRecord.id !== undefined &&
            !canceladosRef.current.current.has(newRecord.id)
          ) {
            toast.custom((t) => (
              <div
                onClick={() => toast.dismiss(t.id)}
                className={`${
                  t.visible ? 'animate-in fade-in slide-in-from-top-5' : 'animate-out fade-out slide-out-to-top-5'
                } max-w-sm w-full bg-white shadow-2xl rounded-2xl cursor-pointer pointer-events-auto ring-1 ring-amber-200 border-l-4 border-amber-500 overflow-hidden`}
              >
                <div className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900">Comanda modificada</p>
                    <p className="text-xs text-gray-500 mt-0.5">El cliente canceló algunos ítems</p>
                  </div>
                </div>
              </div>
            ), { duration: 5000, position: 'top-center' });
          }

          if (newRecord.id !== undefined) {
            canceladosRef.current.current.delete(newRecord.id);
          }

          mutateRef.current();
        },
      )
      .subscribe((status) => {
        console.log(`📡 [KDSListener] ${sector} — Estado: ${status}`);
      });

    return () => {
      console.log(`🔌 [KDSListener] Desconectando canal kds-${sector}-${localId}`);
      supabase.removeChannel(canal);
    };
  }, [localId, sector]);

  return null;
}
