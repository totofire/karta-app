'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BellRing, X } from 'lucide-react';

export default function PedidosListener() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // 1. INICIALIZAR AUDIO (Una sola vez)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Crear instancia de audio
    const audio = new Audio('/sounds/ding.mp3');
    audio.preload = 'auto';
    audio.volume = 1.0;
    audioRef.current = audio;

    console.log('🍔 [PEDIDOS] Sistema de audio listo');

    // Estrategia de desbloqueo (primer clic)
    const unlockAudio = () => {
      if (audioRef.current && !isAudioUnlocked) {
        audioRef.current.play()
          .then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
            setIsAudioUnlocked(true);
            console.log('🔓 [PEDIDOS] Audio desbloqueado');
            
            // Limpiamos los listeners una vez desbloqueado
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
          })
          .catch((e) => {
            // Si falla, es normal (el usuario no interactuó aún), seguimos esperando
            console.log("Esperando interacción para audio...");
          });
      }
    };

    // Escuchamos cualquier interacción
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
  }, [isAudioUnlocked]);

  // 2. ESCUCHAR SUPABASE
  useEffect(() => {
    console.log('🟢 [PEDIDOS] Iniciando conexión...');

    // CAMBIAMOS EL NOMBRE DEL CANAL PARA FORZAR RECONEXIÓN LIMPIA
    const channel = supabase
      .channel('pedidos-fix-v2') 
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Pedido' },
        (payload) => {
          console.log('🔔 [NUEVO PEDIDO]', payload);

          // Obtenemos los datos nuevos
          const pedido = payload.new || {};

          // 1. Reproducir sonido
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio bloqueado:", e));
          }

          // 2. Vibración
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
             navigator.vibrate([200, 100, 200]);
          }

          // 3. Mostrar Toast (Diseño Clásico Verde)
          mostrarNotificacion(pedido);

          // 4. Refrescar la página para ver el pedido en la lista
          router.refresh();
        }
      )
      .subscribe((status) => {
        console.log('📡 [PEDIDOS] Estado:', status);
      });

    return () => {
      console.log('🔴 [PEDIDOS] Desconectando...');
      supabase.removeChannel(channel);
    };
  }, [router]);

  // 3. DISEÑO VISUAL (El original que te gustaba)
  const mostrarNotificacion = (pedido: any) => {
    const titulo = "¡NUEVO PEDIDO! 🍔";
    const texto = pedido?.id ? `Pedido #${pedido.id}` : `Revisar listado`;

    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          router.push('/admin');
        }}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out'
        } max-w-sm w-full bg-white shadow-2xl rounded-2xl cursor-pointer border-l-4 border-green-500 hover:shadow-green-200 transition-shadow`}
      >
        <div className="p-4 flex items-center gap-4">
          {/* Ícono Verde Rebotando */}
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <BellRing size={24} className="text-green-600 animate-bounce" strokeWidth={3} />
          </div>
          
          {/* Textos */}
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-600 font-medium mt-0.5">{texto}</p>
          </div>
          
          {/* Botón Cerrar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    ), { duration: 5000, position: 'top-right' });
  };

  return null;
}