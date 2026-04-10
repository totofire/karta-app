'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { Ban, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRealtimeReconnect } from '@/hooks/useRealtimeReconnect';

interface KDSListenerProps {
  sector: 'cocina' | 'barra';
  mutate: () => void;
  canceladosPorAdmin: React.MutableRefObject<Set<number>>;
}

const fetcherMe = (url: string) => fetch(url).then(r => r.ok ? r.json() : null);

/**
 * Listener broadcast para las páginas KDS (Cocina y Barra).
 * Escucha pedido:update en canal `local-{localId}` para:
 *  - Toast de cancelación total
 *  - Toast de comanda modificada (cancelación parcial)
 *  - mutate() para refrescar SWR
 */
export default function KDSListener({ sector, mutate, canceladosPorAdmin }: KDSListenerProps) {
  const { data: me } = useSWR('/api/auth/me', fetcherMe, { revalidateOnFocus: false });
  const localId: number | null = me?.localId ?? null;

  const mutateRef       = useRef(mutate);
  const canceladosRef   = useRef(canceladosPorAdmin);
  useEffect(() => { mutateRef.current     = mutate;            }, [mutate]);
  useEffect(() => { canceladosRef.current = canceladosPorAdmin; }, [canceladosPorAdmin]);

  useRealtimeReconnect({
    mutators: [mutate],
  });

  useEffect(() => {
    if (!localId) return;

    console.log(`[RT] Conectando broadcast kds-${sector} local-${localId}...`);

    const canal = supabase
      .channel(`local-${localId}-kds-${sector}`)
      .on("broadcast", { event: "pedido:update" }, (msg) => {
        const data = msg.payload as Record<string, any>;
        console.log(`[RT] 📥 kds-${sector} pedido:update`, data);

        const pedidoId = data?.pedidoId as number | undefined;
        const estado = data?.estado as string | undefined;

        // Cancelación total por alguien externo a este KDS
        if (
          estado === "CANCELADO" &&
          pedidoId !== undefined &&
          !canceladosRef.current.current.has(pedidoId)
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

        // Cancelación parcial: item cancelado dentro de un pedido
        if (data?.itemCancelado && pedidoId !== undefined && !canceladosRef.current.current.has(pedidoId)) {
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

        if (pedidoId !== undefined) {
          canceladosRef.current.current.delete(pedidoId);
        }

        mutateRef.current();
      })
      .on("broadcast", { event: "pedido:insert" }, () => {
        mutateRef.current();
      })
      .on("broadcast", { event: "pedido:delete" }, () => {
        mutateRef.current();
      })
      .subscribe((status, err) => {
        console.log(`[RT] kds-${sector} local-${localId} status: ${status}`, err || "");
        if (status === "SUBSCRIBED") {
          console.log(`[RT] ✅ kds-${sector} activo — ${new Date().toISOString()}`);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[RT] ❌ kds-${sector} ${status}:`, err);
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [localId, sector]);

  return null;
}
