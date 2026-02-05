'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { HandCoins, X } from 'lucide-react';

export default function CuentasListener() {
  const router = useRouter();
  const audioCaja = useRef<HTMLAudioElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const mesasSolicitadasRef = useRef<Set<number>>(new Set());

  // ===== INICIALIZAR AUDIO DE CUENTAS =====
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('💰 [CUENTAS] Inicializando audio...');

    // Verificar si ya fue habilitado
    const wasEnabled = localStorage.getItem('cuentasAudioEnabled') === 'true';
    if (wasEnabled) {
      setAudioEnabled(true);
    }

    // Crear audio
    audioCaja.current = new Audio('/sounds/caja.mp3');
    audioCaja.current.preload = 'auto';
    audioCaja.current.volume = 1.0;

    audioCaja.current.onloadeddata = () => {
      console.log('✅ [CUENTAS] caja.mp3 cargado');
    };

    audioCaja.current.onerror = () => {
      console.error('❌ [CUENTAS] Error al cargar caja.mp3');
    };

    return () => {
      if (audioCaja.current) {
        audioCaja.current.pause();
        audioCaja.current = null;
      }
    };
  }, []);

  // ===== DESBLOQUEAR AUDIO DE CUENTAS =====
  useEffect(() => {
    const handleUserInteraction = async () => {
      if (!audioEnabled && audioCaja.current) {
        try {
          console.log('🔓 [CUENTAS] Desbloqueando audio...');
          audioCaja.current.volume = 0.01;
          await audioCaja.current.play();
          audioCaja.current.pause();
          audioCaja.current.currentTime = 0;
          audioCaja.current.volume = 1.0;
          setAudioEnabled(true);
          localStorage.setItem('cuentasAudioEnabled', 'true');
          console.log('✅ [CUENTAS] Audio desbloqueado');
        } catch (error) {
          console.warn('⚠️ [CUENTAS] No se pudo desbloquear:', error);
        }
      }
    };

    // Desbloquear con cualquier interacción
    document.addEventListener('click', handleUserInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [audioEnabled]);

  // ===== LISTENER DE SOLICITUD DE CUENTAS =====
  useEffect(() => {
    console.log('🟢 [CUENTAS] Iniciando listener...');

    const channel = supabase
      .channel('cuentas-listener')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Sesion' },
        async (payload) => {
          // Detectar si solicitaCuenta cambió de null a una fecha
          const acabaDeSolicitar =
            !payload.old.solicitaCuenta &&
            payload.new.solicitaCuenta;

          if (!acabaDeSolicitar) return;

          const mesaId = payload.new.mesaId;

          // Evitar duplicados
          if (mesasSolicitadasRef.current.has(mesaId)) {
            console.log('⚠️ [CUENTAS] Mesa ya notificada:', mesaId);
            return;
          }

          mesasSolicitadasRef.current.add(mesaId);
          console.log('💸 [CUENTAS] Solicitud de cuenta - Mesa:', mesaId);

          // 1. Reproducir sonido
          if (audioEnabled && audioCaja.current) {
            try {
              audioCaja.current.currentTime = 0;
              await audioCaja.current.play();
              console.log('🔊 [CUENTAS] Sonido reproducido');
            } catch (error) {
              console.error('❌ [CUENTAS] Error al reproducir:', error);
            }
          }

          // 2. Vibración (más larga para cuentas)
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 150, 300, 150, 300]);
          }

          // 3. Notificación
          mostrarNotificacion(mesaId);

          // 4. Refrescar
          router.refresh();
        }
      )
      .subscribe((status) => {
        console.log('📡 [CUENTAS] Estado:', status);
      });

    return () => {
      console.log('🔴 [CUENTAS] Limpiando listener');
      supabase.removeChannel(channel);
    };
  }, [router, audioEnabled]);

  // ===== MOSTRAR NOTIFICACIÓN =====
  const mostrarNotificacion = (mesaId: number) => {
    const titulo = "🔔 ¡PIDEN LA CUENTA!";
    const texto = `Mesa ${mesaId}`;

    // Toast
    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          router.push('/admin');
        }}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out'
        } max-w-sm w-full bg-yellow-50 shadow-2xl rounded-2xl cursor-pointer border-l-4 border-yellow-500 hover:shadow-yellow-200 transition-shadow`}
      >
        <div className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <HandCoins size={24} className="text-yellow-600 animate-pulse" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-yellow-900">{titulo}</p>
            <p className="text-xs text-yellow-700 font-medium mt-0.5">{texto}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="text-yellow-600 hover:text-yellow-800"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    ), { duration: 8000, position: 'top-right' });

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
        tag: `cuenta-${mesaId}`,
        requireInteraction: true,
      });

      // Vibración móvil
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 300]);
      }

      setTimeout(() => notification.close(), 10000);

      notification.onclick = () => {
        window.focus();
        router.push('/admin');
        notification.close();
      };
    }
  };

  return null;
}