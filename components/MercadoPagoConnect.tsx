"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Link2, Link2Off, Loader2 } from "lucide-react";

interface Props {
  mpEmail:       string | null;
  mpConectadoEn: string | null;
}

export default function MercadoPagoConnect({ mpEmail, mpConectadoEn }: Props) {
  const [desconectando, setDesconectando] = useState(false);
  const conectado = !!mpEmail;

  const desconectar = async () => {
    if (!confirm("¿Desconectar Mercado Pago? Los pagos con QR dejarán de funcionar.")) return;
    setDesconectando(true);
    try {
      const res = await fetch("/api/mp/desconectar", { method: "POST" });
      if (res.ok) {
        toast.success("Mercado Pago desconectado");
        window.location.reload();
      } else {
        toast.error("Error al desconectar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDesconectando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-800 text-base">Mercado Pago</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Recibí pagos con QR directo en tu cuenta
          </p>
        </div>
        {/* Logo MP */}
        <div className="w-10 h-10 bg-[#009EE3] rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">MP</span>
        </div>
      </div>

      {conectado ? (
        /* ── CONECTADO ── */
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="text-green-600 shrink-0" size={20}/>
            <div>
              <p className="text-sm font-black text-green-800">Conectado</p>
              <p className="text-xs text-green-600 mt-0.5">{mpEmail}</p>
              {mpConectadoEn && (
                <p className="text-[10px] text-green-400 mt-0.5">
                  Desde {new Date(mpConectadoEn).toLocaleDateString("es-AR")}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={desconectar}
            disabled={desconectando}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-100 text-red-500 font-bold text-sm hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
          >
            {desconectando
              ? <Loader2 size={16} className="animate-spin"/>
              : <Link2Off size={16}/>
            }
            Desconectar
          </button>
        </div>

      ) : (
        /* ── NO CONECTADO ── */
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-500 leading-relaxed">
            Conectá tu cuenta de Mercado Pago para que tus clientes puedan pagar con QR directamente en tu cuenta.
          </div>

          <a href="/api/mp/auth">
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#009EE3] hover:bg-[#0080c0] text-white font-black text-sm transition-all active:scale-95 shadow-md shadow-blue-100">
              <Link2 size={16}/>
              Conectar Mercado Pago
            </button>
          </a>

          <p className="text-center text-[10px] text-gray-400">
            La plata va directo a tu cuenta. Karta nunca toca tus fondos.
          </p>
        </div>
      )}
    </div>
  );
}