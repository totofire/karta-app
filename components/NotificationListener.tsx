'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BellRing, Volume2, HandCoins } from 'lucide-react';

export default function NotificationListener() {
  const router = useRouter();
  
  // Referencias separadas para cada audio
  const audioDing = useRef<HTMLAudioElement | null>(null);
  const audioCaja = useRef<HTMLAudioElement | null>(null);
  
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);

  // Track de mesas que ya solicitaron cuenta (para evitar duplicados)
  const mesasSolicitadasRef = useRef<Set<number>>(new Set());

  // ===== INICIALIZACIÓN DE AUDIOS =====
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Crear ambos elementos de audio
      audioDing.current = new Audio('/sounds/ding.mp3');
      audioDing.current.preload = 'auto';
      audioDing.current.volume = 1.0;

      audioCaja.current = new Audio('/sounds/caja.mp3');
      audioCaja.current.preload = 'auto';
      audioCaja.current.volume = 1.0;

      // Solicitar permisos de notificaciones del sistema
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      // Cleanup: liberar recursos de audio
      if (audioDing.current) {
        audioDing.current.pause();
        audioDing.current = null;
      }
      if (audioCaja.current) {
        audioCaja.current.pause();
        audioCaja.current = null;
      }
    };
  }, []);

  // ===== DESBLOQUEO DE AUDIO (CRÍTICO PARA AUTOPLAY) =====
  const habilitarAudio = async () => {
    try {
      // Desbloquear AMBOS audios con volumen bajo
      const promises = [];

      if (audioDing.current) {
        audioDing.current.volume = 0.01;
        promises.push(
          audioDing.current.play()
            .then(() => {
              audioDing.current!.pause();
              audioDing.current!.currentTime = 0;
              audioDing.current!.volume = 1.0;
            })
        );
      }

      if (audioCaja.current) {
        audioCaja.current.volume = 0.01;
        promises.push(
          audioCaja.current.play()
            .then(() => {
              audioCaja.current!.pause();
              audioCaja.current!.currentTime = 0;
              audioCaja.current!.volume = 1.0;
            })
        );
      }

      await Promise.all(promises);
      
      setAudioEnabled(true);
      setShowAudioPrompt(false);
      toast.success('🔊 Sonidos de notificación activados', { duration: 2000 });
    } catch (error) {
      console.error('Error al habilitar audio:', error);
      toast.error('No se pudo activar el sonido. Intenta de nuevo.', { duration: 3000 });
    }
  };

  // ===== LISTENER 1: NUEVOS PEDIDOS (INSERT) =====
  useEffect(() => {
    console.log('🟢 Listener de NUEVOS PEDIDOS activado');

    const channelPedidos = supabase
      .channel('pedidos-nuevos-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'Pedido' 
        },
        async (payload) => {
          console.log('🔔 NUEVO PEDIDO:', payload);

          // 1. Reproducir sonido de pedido
          if (audioEnabled && audioDing.current) {
            try {
              audioDing.current.currentTime = 0;
              await audioDing.current.play();
            } catch (error) {
              console.log('🔇 Audio bloqueado:', error);
              setShowAudioPrompt(true);
            }
          }

          // 2. Refrescar la UI
          router.refresh();

          // 3. Mostrar notificación VERDE
          notificarNuevoPedido(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('📡 Canal Pedidos:', status);
      });

    return () => {
      console.log('🔴 Limpiando canal de pedidos');
      supabase.removeChannel(channelPedidos);
    };
  }, [router, audioEnabled]);

  // ===== LISTENER 2: SOLICITUD DE CUENTA (UPDATE) =====
  useEffect(() => {
    console.log('🟡 Listener de SOLICITUD DE CUENTA activado');

    const channelSesiones = supabase
      .channel('sesiones-cuenta-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'Sesion' 
        },
        async (payload) => {
          const sesionAnterior = payload.old;
          const sesionActual = payload.new;

          // Detectar cambio: solicitaCuenta pasó de null a una fecha
          const acabaDeSolicitar = 
            !sesionAnterior.solicitaCuenta && 
            sesionActual.solicitaCuenta;

          if (acabaDeSolicitar) {
            const mesaId = sesionActual.mesaId;

            // Evitar duplicados
            if (mesasSolicitadasRef.current.has(mesaId)) {
              console.log('⚠️ Mesa', mesaId, 'ya notificada, ignorando...');
              return;
            }

            mesasSolicitadasRef.current.add(mesaId);
            
            console.log('💸 SOLICITUD DE CUENTA - Mesa:', mesaId, payload);

            // 1. Reproducir sonido de caja
            if (audioEnabled && audioCaja.current) {
              try {
                audioCaja.current.currentTime = 0;
                await audioCaja.current.play();
              } catch (error) {
                console.log('🔇 Audio caja bloqueado:', error);
                setShowAudioPrompt(true);
              }
            }

            // 2. Refrescar la UI
            router.refresh();

            // 3. Mostrar notificación AMARILLA
            notificarSolicitudCuenta(mesaId);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Canal Sesiones:', status);
      });

    return () => {
      console.log('🔴 Limpiando canal de sesiones');
      supabase.removeChannel(channelSesiones);
    };
  }, [router, audioEnabled]);

  // ===== NOTIFICACIÓN: NUEVO PEDIDO (VERDE) =====
  const notificarNuevoPedido = (pedido: any) => {
    const titulo = "¡NUEVO PEDIDO RECIBIDO! 🍔";
    const texto = pedido?.id 
      ? `Pedido #${pedido.id} ingresado` 
      : `Revisar listado de pedidos`;

    // Toast personalizado
    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          window.location.href = "/admin";
        }}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out'
        } max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-green-500 ring-opacity-50 cursor-pointer border-l-4 border-green-500`}
      >
        <div className="flex-1 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 animate-bounce">
            <BellRing size={24} strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-600 font-medium">{texto}</p>
          </div>
        </div>
      </div>
    ), { duration: 5000, position: 'top-right' });

    // Notificación del sistema (si está oculta la ventana)
    if (typeof window !== "undefined" && "Notification" in window && document.hidden) {
      if (Notification.permission === "granted") {
        const notification = new Notification("KARTA: " + titulo, {
          body: texto,
          icon: "/logo-karta.png",
          tag: "nuevo-pedido",
          requireInteraction: false,
        });

        setTimeout(() => notification.close(), 5000);
        
        notification.onclick = () => {
          window.focus();
          window.location.href = "/admin";
          notification.close();
        };
      }
    }
  };

  // ===== NOTIFICACIÓN: SOLICITUD DE CUENTA (AMARILLO) =====
  const notificarSolicitudCuenta = (mesaId: number) => {
    const titulo = "🔔 ¡UNA MESA PIDE LA CUENTA!";
    const texto = `Mesa ID: ${mesaId} - Revisar ahora`;

    // Toast personalizado AMARILLO
    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          window.location.href = "/admin";
        }}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out'
        } max-w-sm w-full bg-yellow-50 shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-yellow-500 ring-opacity-50 cursor-pointer border-l-4 border-yellow-500`}
      >
        <div className="flex-1 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 animate-pulse">
            <HandCoins size={24} strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm font-black text-yellow-900">{titulo}</p>
            <p className="text-xs text-yellow-700 font-medium">{texto}</p>
          </div>
        </div>
      </div>
    ), { duration: 6000, position: 'top-right' });

    // Notificación del sistema
    if (typeof window !== "undefined" && "Notification" in window && document.hidden) {
      if (Notification.permission === "granted") {
        const notification = new Notification("KARTA: " + titulo, {
          body: texto,
          icon: "/logo-karta.png",
          tag: "solicita-cuenta",
          requireInteraction: true, // Requiere interacción para cerrarse
        });

        setTimeout(() => notification.close(), 8000);
        
        notification.onclick = () => {
          window.focus();
          window.location.href = "/admin";
          notification.close();
        };
      }
    }
  };

  // ===== UI: PROMPT DE ACTIVACIÓN DE AUDIO =====
  if (showAudioPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-10">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-2xl max-w-xs border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full animate-pulse shadow-lg">
              <Volume2 size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-base">Activar Alertas</h3>
              <p className="text-xs text-slate-300 font-medium">Sonidos para pedidos y cuentas</p>
            </div>
          </div>
          <button
            onClick={habilitarAudio}
            className="w-full bg-white text-slate-900 py-3 rounded-xl text-sm font-black hover:bg-gray-100 transition-all active:scale-95 shadow-md"
          >
            🔊 Activar Sonidos
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-3">
            Los navegadores bloquean sonidos automáticos. <br/>Haz clic para permitirlos.
          </p>
        </div>
      </div>
    );
  }

  return null;
}