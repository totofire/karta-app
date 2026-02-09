// lib/notify.tsx
import toast from 'react-hot-toast';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChefHat, 
  UtensilsCrossed, 
  X, 
  BellRing,
  Info
} from 'lucide-react';

// Configuraciones de vibración
const vibrateSuccess = () => typeof navigator !== 'undefined' && navigator.vibrate?.([100, 50, 100]);
const vibrateError = () => typeof navigator !== 'undefined' && navigator.vibrate?.([200, 100, 200]);
const vibrateWarning = () => typeof navigator !== 'undefined' && navigator.vibrate?.([300]);

export const notify = {
  // 1. ÉXITO (Estilo Card Verde/Premium - Ideal para "Pedido Listo" o "Guardado")
  success: (titulo: string, mensaje?: string) => {
    vibrateSuccess();
    toast.custom((t) => (
      <div
        onClick={() => toast.dismiss(t.id)}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-bottom-5' : 'animate-out fade-out slide-out-to-bottom-5'
        } max-w-sm w-full bg-white shadow-xl rounded-2xl cursor-pointer pointer-events-auto ring-1 ring-black/5 flex flex-col overflow-hidden`}
      >
        <div className="relative p-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="text-emerald-600 h-6 w-6" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{titulo}</h3>
                    {mensaje && (
                      <p className="text-xs text-emerald-700 font-medium mt-0.5">{mensaje}</p>
                    )}
                </div>
            </div>
        </div>
        <div className="h-1 w-full bg-emerald-100">
            <div className="h-full bg-emerald-500 animate-[progress_4s_linear_forwards]" style={{width: '100%'}}></div>
        </div>
      </div>
    ), { duration: 4000, position: 'bottom-center' });
  },

  // 2. ERROR / CANCELADO (Estilo Alerta Roja - Ideal para fallos críticos)
  error: (titulo: string, mensaje: string = "Revisa tu conexión o intenta de nuevo") => {
    vibrateError();
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-5' : 'animate-out fade-out slide-out-to-top-5'} 
        max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto flex overflow-hidden ring-1 ring-red-100 border-l-4 border-red-500`}>
        <div className="flex-1 p-4 flex items-start gap-3">
            <div className="shrink-0 pt-0.5">
               <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{titulo}</p>
              <p className="mt-1 text-sm text-gray-500 leading-snug">{mensaje}</p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={18} />
            </button>
        </div>
      </div>
    ), { duration: 6000, position: 'top-center' });
  },

  // 3. COCINA / PEDIDO (Estilo Chef - Específico para nuevos pedidos)
  pedido: (titulo: string, id: number | string) => {
    vibrateSuccess();
    toast.custom((t) => (
      <div
        onClick={() => toast.dismiss(t.id)}
        className={`${
          t.visible ? 'animate-in fade-in slide-in-from-top-5' : 'animate-out fade-out slide-out-to-top-5'
        } max-w-sm w-full bg-white shadow-2xl rounded-2xl cursor-pointer pointer-events-auto ring-1 ring-black/5 border-l-4 border-orange-500`}
      >
        <div className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <ChefHat size={24} className="text-orange-600 animate-bounce" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1">
               <UtensilsCrossed size={10} /> Pedido #{id}
            </p>
          </div>
          <X size={16} className="text-gray-300" />
        </div>
      </div>
    ), { duration: 5000, position: 'top-right' });
  },

  // 4. ATENCIÓN / CUENTA (Estilo Amarillo - Para llamados de mesa)
  atencion: (titulo: string, mesa: string) => {
    vibrateWarning();
    toast.custom((t) => (
        <div
          onClick={() => toast.dismiss(t.id)}
          className={`${
            t.visible ? 'animate-in fade-in zoom-in' : 'animate-out fade-out zoom-out'
          } max-w-sm w-full bg-yellow-50 shadow-xl rounded-2xl border border-yellow-200 cursor-pointer`}
        >
          <div className="p-4 flex items-center gap-3">
            <div className="bg-yellow-400 p-2 rounded-full text-white animate-pulse">
                <BellRing size={20} />
            </div>
            <div>
                <h4 className="font-bold text-yellow-900 text-sm">{titulo}</h4>
                <p className="text-yellow-700 text-xs">{mesa}</p>
            </div>
          </div>
        </div>
    ), { duration: 8000, position: 'top-right' });
  }
};