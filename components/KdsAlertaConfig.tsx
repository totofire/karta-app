"use client";
import { useState } from "react";
import { Timer, Minus, Plus, Check } from "lucide-react";
import toast from "react-hot-toast";

const OPCIONES = [5, 10, 15, 20, 30];

export default function KdsAlertaConfig({ inicial }: { inicial: number }) {
  const [minutos, setMinutos] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const guardar = async (valor: number) => {
    setGuardando(true);
    setGuardado(false);
    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertaKdsMinutos: valor }),
      });
      if (!res.ok) throw new Error();
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const cambiar = (valor: number) => {
    const nuevo = Math.max(1, valor);
    setMinutos(nuevo);
    guardar(nuevo);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
          <Timer size={18} className="text-amber-600" />
        </div>
        <div>
          <p className="font-black text-gray-800 text-sm">Alerta de demora en KDS</p>
          <p className="text-xs text-gray-400 font-medium">
            Las comandas que superen este tiempo se marcan en rojo
          </p>
        </div>
      </div>

      {/* Botones rápidos */}
      <div className="flex gap-2 flex-wrap">
        {OPCIONES.map((op) => (
          <button
            key={op}
            onClick={() => cambiar(op)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
              minutos === op
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-600"
            }`}
          >
            {op} min
          </button>
        ))}
      </div>

      {/* Control manual */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => cambiar(minutos - 1)}
          disabled={minutos <= 1}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          <Minus size={16} />
        </button>

        <div className="flex-1 flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
          <span className="text-2xl font-black text-gray-900 tabular-nums">{minutos}</span>
          <span className="text-sm font-bold text-gray-400">minutos</span>
          {guardando && (
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">guardando...</span>
          )}
          {guardado && !guardando && (
            <Check size={14} className="text-green-500" />
          )}
        </div>

        <button
          onClick={() => cambiar(minutos + 1)}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
