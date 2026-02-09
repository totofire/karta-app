'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify'; // 🔥 Importamos la librería unificada

export default function PedidosListener() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // 1. INICIALIZAR AUDIO (Misma lógica robusta que ya tenías)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Crear instancia de audio
    const audio = new Audio('/sounds/ding.mp3');
    audio.preload = 'auto';
    audio.volume = 1.0;
    audioRef.current = audio;

    // Estrategia de desbloqueo (primer clic)
    const unlockAudio = () => {
      if (audioRef.current && !isAudioUnlocked) {
        audioRef.current.play()
          .then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
            setIsAudioUnlocked(true);
            
            // Limpiamos los listeners una vez desbloqueado
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
          })
          .catch(() => {
            // Ignoramos errores de autoplay hasta que el usuario interactúe
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

    const channel = supabase
      .channel('pedidos-standard-v1') // Nombre fresco para forzar conexión limpia
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Pedido' },
        (payload) => {
          const pedido = payload.new || {};

          // 1. Reproducir sonido
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error("Audio bloqueado:", e));
          }

          // 2. Vibración
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
          }

          // 3. Notificación Visual (ESTANDARIZADA)
          // Usamos la nueva librería que unifica el diseño
          notify.pedido("¡NUEVO PEDIDO!", pedido.id || '???');

          // 4. Refrescar la página
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}