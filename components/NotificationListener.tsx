'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BellRing, Volume2, HandCoins, X } from 'lucide-react';

export default function NotificationListener() {
  const router = useRouter();
  
  // Referencias para AMBOS audios
  const audioDing = useRef<HTMLAudioElement | null>(null);
  const audioCaja = useRef<HTMLAudioElement | null>(null);
  
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Track de mesas que ya solicitaron cuenta (evitar duplicados)
  const mesasSolicitadasRef = useRef<Set<number>>(new Set());

  // ===== INICIALIZACIÓN DE AMBOS AUDIOS =====
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Verificar si el audio ya fue habilitado previamente
    const audioWasEnabled = localStorage.getItem('audioEnabled') === 'true';
    if (audioWasEnabled) {
      setAudioEnabled(true);
      setShowAudioPrompt(false);
    }

    // Crear AMBOS elementos de audio
    audioDing.current = new Audio('/sounds/ding.mp3');
    audioDing.current.preload = 'auto';
    audioDing.current.volume = 1.0;
    audioDing.current.onerror = () => {
      console.error('❌ Error al cargar ding.mp3');
    };

    audioCaja.current = new Audio('/sounds/caja.mp3');
    audioCaja.current.preload = 'auto';
    audioCaja.current.volume = 1.0;
    audioCaja.current.onerror = () => {
      console.error('❌ Error al cargar caja.mp3');
    };

    // Solicitar permisos de notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'denied') {
          toast.error('Permisos de notificación denegados', { duration: 3000 });
        }
      });
    }

    // Cleanup
    return () => {
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

  // ===== HABILITAR AMBOS AUDIOS CON INTERACCIÓN =====
  const habilitarAudio = useCallback(async () => {
    try {
      const promises = [];

      // Desbloquear AUDIO 1 (ding)
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

      // Desbloquear AUDIO 2 (caja)
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
      localStorage.setItem('audioEnabled', 'true');
      
      toast.success('🔊 Sonidos activados correctamente', { duration: 2000 });
    } catch (error) {
      console.error('Error al habilitar audio:', error);
      toast.error('No se pudo activar el sonido', { duration: 3000 });
    }
  }, []);

  // ===== REPRODUCIR SONIDO DE PEDIDO =====
  const reproducirDing = useCallback(async () => {
    if (!audioEnabled || !audioDing.current) return;

    try {
      audioDing.current.currentTime = 0;
      await audioDing.current.play();
    } catch (error) {
      console.warn('🔇 Audio ding bloqueado:', error);
      setShowAudioPrompt(true);
    }
  }, [audioEnabled]);

  // ===== REPRODUCIR SONIDO DE CUENTA =====
  const reproducirCaja = useCallback(async () => {
    if (!audioEnabled || !audioCaja.current) return;

    try {
      audioCaja.current.currentTime = 0;
      await audioCaja.current.play();
    } catch (error) {
      console.warn('🔇 Audio caja bloqueado:', error);
      setShowAudioPrompt(true);
    }
  }, [audioEnabled]);

  // ===== NOTIFICACIÓN: NUEVO PEDIDO (VERDE) =====
  const notificarNuevoPedido = useCallback((pedido: any) => {
    const titulo = "¡NUEVO PEDIDO RECIBIDO! 🍔";
    const texto = pedido?.id 
      ? `Pedido #${pedido.id} ingresado` 
      : `Revisar listado de pedidos`;

    // Toast personalizado VERDE
    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          router.push('/admin');
        }}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out'
        } max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-green-500 cursor-pointer border-l-4 border-green-500 hover:shadow-green-200 transition-shadow`}
      >
        <div className="flex-1 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <BellRing size={24} className="animate-bounce" strokeWidth={3} />
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
    ), { 
      duration: 6000, 
      position: 'top-right',
      id: `pedido-${pedido?.id || Date.now()}`
    });

    // Vibración móvil
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

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
        silent: false,
      });

      setTimeout(() => notification.close(), 5000);

      notification.onclick = () => {
        window.focus();
        router.push('/admin');
        notification.close();
      };
    }
  }, [router]);

  // ===== NOTIFICACIÓN: SOLICITUD DE CUENTA (AMARILLO) =====
  const notificarSolicitudCuenta = useCallback((mesaId: number) => {
    const titulo = "🔔 ¡UNA MESA PIDE LA CUENTA!";
    const texto = `Mesa ID: ${mesaId} - Revisar ahora`;

    // Toast personalizado AMARILLO
    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          router.push('/admin');
        }}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out'
        } max-w-sm w-full bg-yellow-50 shadow-2xl rounded-2xl pointer-events-auto flex ring-2 ring-yellow-500 cursor-pointer border-l-4 border-yellow-500 hover:shadow-yellow-200 transition-shadow`}
      >
        <div className="flex-1 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0">
            <HandCoins size={24} className="animate-pulse" strokeWidth={3} />
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
    ), { 
      duration: 8000, 
      position: 'top-right',
      id: `cuenta-${mesaId}-${Date.now()}`
    });

    // Vibración móvil MÁS LARGA para cuentas
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 300]);
    }

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
        silent: false,
      });

      setTimeout(() => notification.close(), 10000);

      notification.onclick = () => {
        window.focus();
        router.push('/admin');
        notification.close();
      };
    }
  }, [router]);

  // ===== LISTENER UNIFICADO (UN SOLO CANAL) =====
  useEffect(() => {
    console.log('🟢 Iniciando listener unificado...');

    const channel = supabase
      .channel('notificaciones-realtime') // UN SOLO CANAL
      // Listener 1: NUEVOS PEDIDOS (INSERT)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'Pedido' 
        },
        async (payload) => {
          console.log('🔔 NUEVO PEDIDO:', payload);

          // 1. Sonido de pedido
          await reproducirDing();

          // 2. Notificación verde
          notificarNuevoPedido(payload.new);

          // 3. Refrescar UI
          router.refresh();
        }
      )
      // Listener 2: SOLICITUD DE CUENTA (UPDATE)
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
              console.log('⚠️ Mesa', mesaId, 'ya notificada');
              return;
            }

            mesasSolicitadasRef.current.add(mesaId);
            console.log('💸 SOLICITUD DE CUENTA - Mesa:', mesaId);

            // 1. Sonido de caja
            await reproducirCaja();

            // 2. Notificación amarilla
            notificarSolicitudCuenta(mesaId);

            // 3. Refrescar UI
            router.refresh();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado del canal:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          console.log('✅ Suscripción exitosa a AMBOS eventos');
        } else if (status === 'CLOSED') {
          setIsSubscribed(false);
          console.warn('⚠️ Canal cerrado');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en el canal');
          toast.error('Error en la conexión de notificaciones');
        }
      });

    // Cleanup
    return () => {
      console.log('🔴 Limpiando listener unificado');
      supabase.removeChannel(channel);
      setIsSubscribed(false);
    };
  }, [router, reproducirDing, reproducirCaja, notificarNuevoPedido, notificarSolicitudCuenta]);

  // ===== CERRAR PROMPT MANUALMENTE =====
  const cerrarPrompt = useCallback(() => {
    setShowAudioPrompt(false);
    localStorage.setItem('audioPromptDismissed', 'true');
  }, []);

  // ===== UI: PROMPT DE ACTIVACIÓN =====
  if (showAudioPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-10">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-2xl max-w-sm border border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full animate-pulse shadow-lg">
                <Volume2 size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-base">Activar Alertas</h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Sonidos para pedidos y cuentas
                </p>
              </div>
            </div>
            <button
              onClick={cerrarPrompt}
              className="text-slate-500 hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
          
          <button
            onClick={habilitarAudio}
            className="w-full bg-white text-slate-900 py-3 rounded-xl text-sm font-black hover:bg-gray-100 transition-all active:scale-95 shadow-md"
          >
            🔊 Activar Sonidos
          </button>
          
          <p className="text-[10px] text-slate-400 text-center mt-3">
            Los navegadores requieren interacción para reproducir sonidos
          </p>
        </div>
      </div>
    );
  }

  // Indicador de conexión (solo en desarrollo)
  if (process.env.NODE_ENV === 'development' && isSubscribed) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        Escuchando pedidos y cuentas
      </div>
    );
  }

  return null;
}