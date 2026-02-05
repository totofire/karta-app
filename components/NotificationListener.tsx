'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BellRing, Volume2 } from 'lucide-react';

export default function NotificationListener() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);

  // Inicializar audio y permisos
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Crear el audio element
      audioRef.current = new Audio('/sounds/ding.mp3');
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 1.0;

      // Solicitar permisos de notificaciones
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Función para habilitar el audio con interacción del usuario
  const habilitarAudio = async () => {
    if (audioRef.current) {
      try {
        // Reproducir y pausar inmediatamente para "desbloquear" el audio
        audioRef.current.volume = 0.01;
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 1.0;
        
        setAudioEnabled(true);
        setShowAudioPrompt(false);
        toast.success('🔊 Sonido de notificaciones activado', { duration: 2000 });
      } catch (error) {
        console.error('Error al habilitar audio:', error);
        toast.error('No se pudo activar el sonido. Intenta de nuevo.', { duration: 3000 });
      }
    }
  };

  // Listener de pedidos
  useEffect(() => {
    console.log('🟢 Escuchando pedidos...');

    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Pedido' },
        async (payload) => {
          console.log('🔔 Evento recibido:', payload);

          // 1. Reproducir sonido (solo si está habilitado)
          if (audioEnabled && audioRef.current) {
            try {
              audioRef.current.currentTime = 0;
              await audioRef.current.play();
            } catch (error) {
              console.log('Audio bloqueado por el navegador:', error);
              setShowAudioPrompt(true);
            }
          }

          // 2. Refrescar la pantalla
          router.refresh();

          // 3. Mostrar la notificación
          notificar(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, audioEnabled]);

  const notificar = (pedido: any) => {
    const hayDatos = pedido && pedido.id;
    
    const titulo = "¡NUEVO PEDIDO RECIBIDO! 🍔";
    const texto = hayDatos 
      ? `Pedido #${pedido.id} ingresado` 
      : `Revisar listado de pedidos`;

    mostrarToast(titulo, texto);

    // Notificación de sistema (Windows/Android)
    if (typeof window !== "undefined" && "Notification" in window && document.hidden) {
      if (Notification.permission === "granted") {
        const notification = new Notification("KARTA: " + titulo, {
          body: texto,
          icon: "/logo-karta.png",
          tag: "nuevo-pedido",
          requireInteraction: false,
          silent: false,
        });

        // Auto-cerrar después de 5 segundos
        setTimeout(() => notification.close(), 5000);
        
        // Navegar al hacer click
        notification.onclick = () => {
          window.focus();
          window.location.href = "/admin";
          notification.close();
        };
      }
    }
  };

  const mostrarToast = (titulo: string, texto: string) => {
    toast.custom((t) => (
      <div
        onClick={() => {
          toast.dismiss(t.id);
          window.location.href = "/admin";
        }}
        className={`${
          t.visible ? 'animate-in fade-in' : 'animate-out fade-out'
        } max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer border-l-4 border-green-500`}
      >
        <div className="flex-1 p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <BellRing size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{titulo}</p>
            <p className="text-sm text-gray-500">{texto}</p>
          </div>
        </div>
      </div>
    ), { duration: 5000 });
  };

  // Prompt para habilitar el audio
  if (showAudioPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg shadow-2xl max-w-sm animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <Volume2 size={24} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">Activar notificaciones sonoras</h3>
              <p className="text-xs text-green-50 mb-3">
                Para recibir alertas de nuevos pedidos con sonido, haz clic en el botón.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={habilitarAudio}
                  className="bg-white text-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50 transition-colors"
                >
                  Activar sonido
                </button>
                <button
                  onClick={() => setShowAudioPrompt(false)}
                  className="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
                >
                  Más tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}