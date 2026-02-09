'use client';

import { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import PedidosListener from './PedidosListener';
import CuentasListener from './CuentasListener';

export default function NotificationsManager() {
  const [status, setStatus] = useState<'LOCKED' | 'UNLOCKED'>('LOCKED');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. INICIALIZACIÓN Y DESBLOQUEO AUTOMÁTICO
  useEffect(() => {
    // Crear el audio una sola vez
    audioRef.current = new Audio('/sounds/ding.mp3');

    const intentarDesbloqueo = () => {
        if (!audioRef.current) return;

        // Intentamos reproducir un sonido mudo o muy bajo
        // Esto le dice al navegador: "El usuario interactuó, dame permiso de audio"
        const promesa = audioRef.current.play();

        if (promesa !== undefined) {
            promesa
            .then(() => {
                // ¡ÉXITO! El navegador nos dio permiso
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                setStatus('UNLOCKED');
                
                // Ya no necesitamos escuchar clics, limpiamos la memoria
                document.removeEventListener('click', intentarDesbloqueo);
                document.removeEventListener('touchstart', intentarDesbloqueo);
                document.removeEventListener('keydown', intentarDesbloqueo);
            })
            .catch((error) => {
                // Falló (el navegador bloqueó), seguimos en ROJO esperando interacción real
                console.log("Audio bloqueado esperando interacción...", error);
            });
        }
    };

    // INTENTO 1: Al cargar (si el navegador tiene alto "Media Engagement Index" funcionará solo)
    const storedPref = localStorage.getItem('audioEnabled');
    if (storedPref === 'true') {
        intentarDesbloqueo();
    }

    // INTENTO 2: "Trampa Global"
    // Escuchamos CUALQUIER clic en toda la ventana para desbloquear
    document.addEventListener('click', intentarDesbloqueo);
    document.addEventListener('touchstart', intentarDesbloqueo);
    document.addEventListener('keydown', intentarDesbloqueo); // También si toca una tecla

    return () => {
        document.removeEventListener('click', intentarDesbloqueo);
        document.removeEventListener('touchstart', intentarDesbloqueo);
        document.removeEventListener('keydown', intentarDesbloqueo);
    };
  }, []);

  // Función manual (por si quieren probar el sonido)
  const toggleAudio = async () => {
    if (!audioRef.current) return;

    if (status === 'LOCKED') {
        try {
            await audioRef.current.play();
            setStatus('UNLOCKED');
            localStorage.setItem('audioEnabled', 'true');
            toast.success('Sonido ACTIVADO 🔊');
        } catch (e) {
            toast.error("El navegador bloqueó el sonido");
        }
    } else {
        // Sonido de prueba
        const testAudio = new Audio('/sounds/ding.mp3');
        testAudio.play();
        toast('Prueba de sonido', { icon: '🔊' });
    }
  };

  return (
    <>
      {/* BOTÓN FLOTANTE (Solo visible si está bloqueado o para probar) */}
      <div className={`fixed bottom-4 right-4 z-[9999] transition-all duration-500 ${status === 'UNLOCKED' ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
        
        {/* Tooltip solo si está bloqueado */}
        {status === 'LOCKED' && (
             <div className="absolute bottom-full mb-2 right-0 bg-red-600 text-white text-xs px-3 py-1 rounded-lg font-bold whitespace-nowrap animate-bounce">
                ¡HAZ CLIC PARA ACTIVAR!
            </div>
        )}

        <button
            onClick={toggleAudio}
            className={`
                flex items-center justify-center w-12 h-12 rounded-full shadow-xl border-2 transition-all
                ${status === 'LOCKED' 
                    ? 'bg-red-600 border-white animate-pulse' 
                    : 'bg-green-600 border-green-400'
                }
            `}
        >
            {status === 'LOCKED' ? <VolumeX size={20} className="text-white" /> : <Volume2 size={20} className="text-white" />}
        </button>
      </div>

      <PedidosListener />
      <CuentasListener />
    </>
  );
}