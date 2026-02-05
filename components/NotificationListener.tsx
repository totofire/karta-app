'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BellRing, GlassWater } from 'lucide-react';

export default function NotificationListener() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Inicialización: Permisos y Audio
  useEffect(() => {
    // Pedir permiso para notificaciones del sistema
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    // Pre-cargar el audio
    audioRef.current = new Audio('/sounds/ding.mp3');
  }, []);

  // 2. Conexión a Supabase Realtime
  useEffect(() => {
    console.log('🟢 Iniciando escucha de pedidos en tiempo real...');

    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Escuchamos SOLO nuevos pedidos
          schema: 'public',
          table: 'Pedido',
        },
        async (payload) => {
          console.log('🔔 ¡NUEVO PEDIDO DETECTADO!', payload.new);

          // A. Reproducir sonido
          reproducirAlerta();

          // B. Refrescar datos en pantalla (Next.js server components)
          router.refresh();

          // C. Obtener detalles adicionales si es necesario (opcional)
          // El payload.new tiene los datos crudos de la tabla Pedido.
          // Para saber si es cocina o barra, a veces necesitas consultar los items.
          // Por simplicidad, aquí lanzamos una alerta genérica y refrescamos.
          
          // D. Notificar
          notificar(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado exitosamente a Supabase Realtime');
        }
      });

    // Limpieza al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const reproducirAlerta = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1.0;
      audioRef.current.play().catch((e) => {
        console.warn('Audio bloqueado por el navegador (interacción requerida)', e);
      });
    }
  };

  const notificar = (pedido: any) => {
    // Nota: El payload.new solo trae los datos de la tabla Pedido (id, fecha, total, etc.)
    // No trae relaciones (items, mesa) por defecto en Realtime.
    // Para una alerta rápida, usamos un mensaje genérico.
    // Si necesitas diferenciar Cocina/Barra en la alerta, el router.refresh() 
    // actualizará las tablas de abajo y ahí se verá.
    
    const titulo = "¡NUEVO PEDIDO INGRESADO! 🔔";
    const texto = `Pedido #${pedido.id} - Revisar paneles`;

    // 1. Notificación Visual en la App (Toast)
    mostrarToast(titulo, texto);

    // 2. Notificación del Sistema (Si la app está en segundo plano)
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      document.hidden
    ) {
      if (Notification.permission === "granted") {
        const notif = new Notification("KARTA: " + titulo, {
          body: texto,
          icon: "/logo-karta.png",
          tag: "nuevo-pedido",
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = "/admin"; // Llevar al dashboard general
        };
      }
    }
  };

  const mostrarToast = (titulo: string, texto: string) => {
    toast.custom(
      (t) => (
        <div
          onClick={() => {
            window.location.href = "/admin";
            toast.dismiss(t.id);
          }}
          className={`${
            t.visible ? "animate-in slide-in-from-top-5 fade-in" : "animate-out fade-out"
          } max-w-sm w-full bg-white shadow-xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:scale-[1.02] transition-transform duration-200 overflow-hidden border-l-4 border-green-500`}
        >
          <div className="flex-1 p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-50 text-green-600">
              <BellRing size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">
                {titulo}
              </p>
              <p className="text-sm text-gray-600 truncate">{texto}</p>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">
                CLICK PARA VER
              </p>
            </div>
          </div>
        </div>
      ),
      { duration: 5000, position: "top-right" }
    );
  };

  return null;
}