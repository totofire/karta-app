"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr"; // 🚀 La clave de la velocidad
import toast from "react-hot-toast";
import { 
  RefreshCcw, Filter, Clock, DollarSign, Store 
} from "lucide-react";

// Fetcher simple para SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminDashboard() {
  // Estado local solo para UI
  const [filtroSector, setFiltroSector] = useState("Todos");

  // 🚀 SWR: Maneja la carga, el caché y la revalidación automática
  const { data: mesas = [], mutate, isLoading: cargando } = useSWR(
    '/api/admin/estado',
    fetcher,
    {
      refreshInterval: 5000,      // Actualiza cada 5 segs (Polling)
      revalidateOnFocus: true,    // Actualiza al volver a la pestaña
      keepPreviousData: true,     // Evita parpadeos mientras recarga
    }
  );

  // Cargamos sectores (estos cambian poco, sin auto-refresh)
  const { data: sectores = [] } = useSWR('/api/admin/sectores', fetcher);

  // --- LÓGICA DE COBRO ---
  const solicitarCierre = (sesionId: number, nombre: string, total: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div>
          <h4 className="font-bold text-gray-800">¿Cerrar {nombre}?</h4>
          <p className="text-sm text-gray-500">Total: <b className="text-green-600">${total}</b></p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { toast.dismiss(t.id); ejecutarCierre(sesionId); }}
            className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold"
          >CONFIRMAR</button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-bold"
          >CANCELAR</button>
        </div>
      </div>
    ), { duration: 8000, icon: '💸' });
  };

  const ejecutarCierre = async (sesionId: number) => {
    const toastId = toast.loading("Procesando pago...");
    try {
      const res = await fetch("/api/admin/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId }),
      });

      if (res.ok) {
        toast.success("¡Mesa cobrada! 💰", { id: toastId });
        mutate(); // 🚀 Recarga instantánea inteligente
      } else {
        toast.error("Error al cerrar mesa", { id: toastId });
      }
    } catch (error) {
      toast.error("Error de red", { id: toastId });
    }
  };

  // --- FILTRADO MEMORIZADO ---
  const mesasFiltradas = useMemo(() => {
    return filtroSector === "Todos" 
      ? mesas 
      : mesas.filter((m: any) => m.sector === filtroSector);
  }, [mesas, filtroSector]);

  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Store className="text-red-600" size={24} />
            Control de Salón
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            {cargando ? "Sincronizando..." : `${mesasFiltradas.length} mesas activas`}
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Filter size={16} /></div>
            <select 
              className="pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
            >
              <option value="Todos">Todos los sectores</option>
              {sectores.map((s: any) => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => mutate()}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
          >
            <RefreshCcw size={20} className={cargando ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* GRILLA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mesasFiltradas.map((mesa: any) => (
          <div
            key={mesa.id}
            className={`
              relative p-5 rounded-2xl border transition-all duration-300 group
              ${mesa.estado === "OCUPADA"
                ? "bg-white border-red-100 shadow-lg shadow-red-50 hover:shadow-xl hover:-translate-y-1"
                : "bg-white border-dashed border-gray-200 opacity-60 hover:opacity-100 hover:border-green-200"
              }
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800 leading-tight">{mesa.nombre}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{mesa.sector}</span>
              </div>
              <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${mesa.estado === "OCUPADA" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                {mesa.estado}
              </span>
            </div>

            {mesa.estado === "OCUPADA" ? (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={14} className="text-gray-400" />
                    <span>{new Date(mesa.horaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {mesa.ultimoPedido && (
                      <span className="ml-auto bg-gray-50 px-2 py-0.5 rounded text-[10px] text-gray-400 truncate max-w-[80px]">+ {mesa.ultimoPedido}</span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between pt-3 border-t border-dashed border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase">Total</span>
                    <div className="flex items-center text-gray-900">
                      <DollarSign size={16} className="text-gray-400" strokeWidth={3} />
                      <span className="text-2xl font-black">{mesa.totalActual}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => solicitarCierre(mesa.sesionId, mesa.nombre, mesa.totalActual)}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black active:scale-95 transition-all"
                >COBRAR</button>
              </>
            ) : (
              <div className="h-24 flex flex-col items-center justify-center text-gray-300 gap-2">
                <span className="text-xs font-bold uppercase tracking-widest">Disponible</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}