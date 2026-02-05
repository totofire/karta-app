'use client';

import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PedidosListener from './PedidosListener';
import CuentasListener from './CuentasListener';

export default function NotificationsManager() {
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    // Verificar si ya se activaron los sonidos previamente
    const pedidosEnabled = localStorage.getItem('pedidosAudioEnabled') === 'true';
    const cuentasEnabled = localStorage.getItem('cuentasAudioEnabled') === 'true';

    if (pedidosEnabled && cuentasEnabled) {
      setShowPrompt(false);
    }

    // Solicitar permisos de notificaciones del sistema
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const activarSonidos = () => {
    // El desbloqueo real se hará con el primer click en los listeners individuales
    // Esto solo oculta el prompt y muestra el mensaje
    setShowPrompt(false);
    toast.success('👆 Haz clic en cualquier parte para activar los sonidos', { 
      duration: 4000,
      icon: '🔊' 
    });
  };

  if (showPrompt) {
    return (
      <>
        {/* Prompt de activación */}
        <div className="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-bottom-10">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-2xl max-w-sm border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
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
              onClick={activarSonidos}
              className="w-full bg-white text-slate-900 py-3 rounded-xl text-sm font-black hover:bg-gray-100 transition-all active:scale-95 shadow-md"
            >
              🔊 Activar Sonidos
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-3">
              Los navegadores requieren interacción del usuario
            </p>
          </div>
        </div>

        {/* Listeners (ya se montan pero esperan interacción) */}
        <PedidosListener />
        <CuentasListener />
      </>
    );
  }

  // Solo los listeners, sin UI
  return (
    <>
      <PedidosListener />
      <CuentasListener />
    </>
  );
}