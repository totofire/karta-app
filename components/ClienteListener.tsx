'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
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
          filter: `sesionId=eq.${sesionId}`, // Solo escuchamos esta mesa
        },
        (payload) => {
          const nuevoEstado = payload.new.estado;
          const viejoEstado = payload.old.estado;

          // Si el estado cambió, actuamos
          if (nuevoEstado !== viejoEstado) {
            
            // 1. Caso CANCELADO 🚫
            if (nuevoEstado === 'CANCELADO') {
              mostrarAlertaCancelacion();
              router.refresh(); // Actualiza la UI para que desaparezca de "Mi Cuenta"
            }

            // 2. Caso LISTO/ENTREGADO ✅
            if (nuevoEstado === 'ENTREGADO') {
              mostrarAlertaExito("¡Tu pedido está en camino!");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sesionId, router]);

  const mostrarAlertaCancelacion = () => {
    // SIN AUDIO AQUÍ

    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-in fade-in zoom-in' : 'animate-out fade-out zoom-out'} 
        max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col overflow-hidden border-2 border-red-500`}>
        <div className="bg-red-500 p-4 flex items-center justify-center">
            <AlertCircle size={40} className="text-white animate-bounce" />
        </div>
        <div className="p-6 text-center">
            <h3 className="text-lg font-black text-red-600 mb-2">PEDIDO CANCELADO</h3>
            <p className="text-sm text-gray-600 mb-4">
                La cocina no pudo procesar uno de tus pedidos.
                <br/>
                <span className="font-bold">Por favor, acércate a la barra o llama al mozo.</span>
            </p>
            <button 
                onClick={() => toast.dismiss(t.id)}
                className="bg-red-600 text-white font-bold py-2 px-6 rounded-full text-sm hover:bg-red-700 transition-colors w-full"
            >
                Entendido
            </button>
        </div>
      </div>
    ), { duration: 10000 }); // Dura 10 segundos
  };

  const mostrarAlertaExito = (msg: string) => {
    toast.success(msg, {
        icon: '🍳',
        style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
        },
    });
  };

  return null; // Componente invisible
}