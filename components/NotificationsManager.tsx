'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';
import { audioManager } from '@/lib/audio';
import { pedirPermiso } from '@/lib/webNotify';

export default function NotificationsManager() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // Pedir permiso de notificaciones nativas del navegador (una sola vez)
    pedirPermiso();

    if (audioManager.unlocked) setUnlocked(true);

    const unsub = audioManager.onUnlock(() => setUnlocked(true));

    const handleInteraction = async () => {
      if (audioManager.unlocked) { setUnlocked(true); return; }
      const ok = await audioManager.tryUnlock();
      if (ok) setUnlocked(true);
    };

    document.addEventListener('click',      handleInteraction, { passive: true });
    document.addEventListener('touchstart', handleInteraction, { passive: true });

    return () => {
      unsub();
      document.removeEventListener('click',      handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const handleButton = async () => {
    if (unlocked) {
      audioManager.play('ding');
      toast('Prueba de sonido', { icon: '🔊' });
      return;
    }
    const ok = await audioManager.tryUnlock();
    if (ok) {
      setUnlocked(true);
      audioManager.play('ding');
      toast.success('¡Sonido activado! 🔊');
    } else {
      toast.error('El navegador bloqueó el audio. Intentá de nuevo.');
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] transition-all duration-300 ${unlocked ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}>
      {!unlocked && (
        <div className="absolute bottom-full mb-2 right-0 bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold whitespace-nowrap animate-bounce shadow-lg">
          ¡Tocá para activar el sonido!
        </div>
      )}
      <button
        onClick={handleButton}
        title={unlocked ? 'Probar sonido' : 'Activar sonido'}
        className={`flex items-center justify-center w-12 h-12 rounded-full shadow-xl border-2 transition-all active:scale-95
          ${unlocked ? 'bg-green-600 border-green-400' : 'bg-red-600 border-white animate-pulse'}`}
      >
        {unlocked ? <Volume2 size={20} className="text-white" /> : <VolumeX size={20} className="text-white" />}
      </button>
    </div>
  );
}