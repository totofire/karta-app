'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AlertCircle, ChefHat, X, UtensilsCrossed } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClienteListener({ sesionId }: { sesionId: number }) {
  const router = useRouter();

  useEffect(() => {
    console.log(`📡 Escuchando pedidos para sesión #${sesionId}`);

    const channel = supabase
      .channel(`cliente-sesion-${sesionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Pedido',
          filter: `sesionId=eq.${sesionId}`,
        },
        (payload) => {
          const nuevoEstado = payload.new.estado;
          const viejoEstado = payload.old.estado;

          if (nuevoEstado !== viejoEstado) {
            
            // 1. Caso CANCELADO 🚫
            if (nuevoEstado === 'CANCELADO') {
              if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); // Vibración de error
              mostrarAlertaCancelacion();
              router.refresh(); 
            }

            // 2. Caso LISTO/ENTREGADO ✅
            if (nuevoEstado === 'ENTREGADO') {
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // Vibración de éxito "Ta-da!"
              mostrarAlertaExito();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sesionId, router]);

  // --- UI: ALERTA DE CANCELACIÓN (Mejorada visualmente) ---
  const mostrarAlertaCancelacion = () => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-5' : 'animate-out fade-out slide-out-to-top-5'} 
        max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex overflow-hidden ring-1 ring-black/5`}>
        
        {/* Barra lateral roja */}
        <div className="w-2 bg-red-500" />

        <div className="flex-1 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
               <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
               </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-bold text-gray-900">
                Hubo un inconveniente
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Un pedido fue cancelado. Por favor consulta con el mozo.
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={() => toast.dismiss(t.id)}
              >
                <span className="sr-only">Cerrar</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 8000, position: 'top-center' });
  };

  // --- UI: ALERTA DE ÉXITO (Premium Style) ---
  const mostrarAlertaExito = () => {
    toast.custom((t) => (
      <div
        onClick={() => toast.dismiss(t.id)}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out slide-out-to-bottom-5'
        } max-w-sm w-full bg-white shadow-xl rounded-2xl cursor-pointer pointer-events-auto ring-1 ring-black/5 flex flex-col`}
      >
        {/* Encabezado con gradiente sutil */}
        <div className="relative overflow-hidden rounded-t-2xl p-4 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-4">
                {/* Ícono animado */}
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                    <ChefHat className="text-emerald-600 h-7 w-7 animate-pulse" strokeWidth={2} />
                </div>
                
                <div className="flex-1">
                    <h3 className="font-black text-gray-900 text-lg leading-tight">
                        ¡Pedido en camino!
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-emerald-700 font-medium text-xs uppercase tracking-wide">
                        <UtensilsCrossed size={12} />
                        <span>Saliendo de cocina</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Cuerpo del mensaje */}
        <div className="px-4 pb-4 pt-2 bg-white rounded-b-2xl">
            <p className="text-sm text-gray-500 leading-relaxed">
                Tu plato está listo y está siendo llevado a tu mesa. ¡Prepara los cubiertos!
            </p>
        </div>

        {/* Barra de progreso visual (opcional, le da toque pro) */}
        <div className="h-1 w-full bg-emerald-100">
            <div className="h-full bg-emerald-500 animate-[progress_5s_linear_forwards]" style={{width: '100%'}}></div>
        </div>
      </div>
    ), { duration: 5000, position: 'bottom-center' }); // Posición abajo para fácil alcance (thumb zone)
  };

  return null;
}