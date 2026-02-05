'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BellRing, X } from 'lucide-react';

export default function PedidosListener() {
  const router = useRouter();
  const audioDing = useRef<HTMLAudioElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // ===== INICIALIZAR AUDIO DE PEDIDOS =====
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('🍔 [PEDIDOS] Inicializando audio...');

    // Verificar si ya fue habilitado
    const wasEnabled = localStorage.getItem('pedidosAudioEnabled') === 'true';
    if (wasEnabled) {
      setAudioEnabled(true);
    }

    // Crear audio
    audioDing.current = new Audio('/sounds/ding.mp3');
    audioDing.current.preload = 'auto';
    audioDing.current.volume = 1.0;

    audioDing.current.onloadeddata = () => {
      console.log('✅ [PEDIDOS] ding.mp3 cargado');
    };

    audioDing.current.onerror = () => {
      console.error('❌ [PEDIDOS] Error al cargar ding.mp3');
    };

    return () => {
      if (audioDing.current) {
        audioDing.current.pause();
        audioDing.current = null;
      }
    };
  }, []);

  // ===== DESBLOQUEAR AUDIO DE PEDIDOS =====
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (!audioEnabled && audioDing.current) {
        try {
          console.log('🔓 [PEDIDOS] Desbloqueando audio...');
          audioDing.current.volume = 0.01;
          await audioDing.current.play();
          audioDing.current.pause();
          audioDing.current.currentTime = 0;
          audioDing.current.volume = 1.0;
          setAudioEnabled(true);
          localStorage.setItem('pedidosAudioEnabled', 'true');
          console.log('✅ [PEDIDOS] Audio desbloqueado');
        } catch (error) {
          console.warn('⚠️ [PEDIDOS] No se pudo desbloquear:', error);
        }
      }
    };

    // Desbloquear con cualquier interacción
    document.addEventListener('click', handleUserInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [audioEnabled]);

  // ===== LISTENER DE NUEVOS PEDIDOS =====
  useEffect(() => {
    console.log('🟢 [PEDIDOS] Iniciando listener...');

    const channel = supabase
      .channel('pedidos-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Pedido' },
        async (payload) => {
          console.log('🔔 [PEDIDOS] Nuevo pedido detectado:', payload.new);

          // 1. Reproducir sonido
          if (audioEnabled && audioDing.current) {
            try {
              audioDing.current.currentTime = 0;
              await audioDing.current.play();
              console.log('🔊 [PEDIDOS] Sonido reproducido');
            } catch (error) {
              console.error('❌ [PEDIDOS] Error al reproducir:', error);
            }
          }

          // 2. Vibración
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          // 3. Notificación
          mostrarNotificacion(payload.new);

          // 4. Refrescar
          router.refresh();
        }
      )
      .subscribe((status) => {
        console.log('📡 [PEDIDOS] Estado:', status);
      });

    return () => {
      console.log('🔴 [PEDIDOS] Limpiando listener');
      supabase.removeChannel(channel);
    };
  }, [router, audioEnabled]);

  // ===== MOSTRAR NOTIFICACIÓN =====
  const mostrarNotificacion = (pedido: any) => {
    const titulo = "¡NUEVO PEDIDO! 🍔";
    const texto = pedido?.id ? `Pedido #${pedido.id}` : `Revisar pedidos`;

    // Toast
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
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <BellRing size={24} className="text-green-600 animate-bounce" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-600 font-medium mt-0.5">{texto}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    ), { duration: 5000, position: 'top-right' });

    // Notificación del sistema
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      document.hidden &&
      Notification.permission === 'granted'
    ) {
      const notification = new Notification(`KARTA: ${titulo}`, {
        body: texto,
        icon: '/logo-karta.png',
        tag: `pedido-${pedido?.id}`,
        requireInteraction: false,
      });

      // Vibración móvil
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      setTimeout(() => notification.close(), 5000);

      notification.onclick = () => {
        window.focus();
        router.push('/admin');
        notification.close();
      };
    }
  };

  return null;
}