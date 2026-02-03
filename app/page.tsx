"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";

// Fetcher para SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AdminDashboard() {
  const router = useRouter();
  const [filtroSector, setFiltroSector] = useState("Todos");

  // 🚀 SWR: Manejo automático de caché, revalidación y loading
  const { data: mesas = [], mutate, isLoading } = useSWR(
    '/api/admin/estado',
    fetcher,
    {
      refreshInterval: 5000,      // Auto-refresh cada 5 segundos
      revalidateOnFocus: true,    // Revalida al volver a la pestaña
      keepPreviousData: true,     // Evita parpadeos mientras recarga
      dedupingInterval: 2000,     // Evita requests duplicados en 2 segundos
    }
  );

  // Sectores (se cargan una sola vez, no necesitan refresh constante)
  const { data: sectores = [] } = useSWR('/api/admin/sectores', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // 🚀 Filtrado memorizado (no recalcula si no cambian las dependencias)
  const mesasFiltradas = useMemo(() => {
    if (filtroSector === "Todos") return mesas;
    return mesas.filter((m: any) => m.sector === filtroSector);
  }, [mesas, filtroSector]);

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
            onClick={() => { 
              toast.dismiss(t.id); 
              ejecutarCierre(sesionId); 
            }}
            className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors"
          >
            CONFIRMAR
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
          >
            CANCELAR
          </button>
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
        mutate(); // 🚀 Revalida solo esta página (sin reload completo)
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al cerrar mesa", { id: toastId });
      }
    } catch (error) {
      toast.error("Error de conexión", { id: toastId });
    }
  };

  const cerrarSesion = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-20">
      <header className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">CONTROL</h1>
          <p className="text-slate-500 text-sm flex items-center gap-2">
            {isLoading && mesas.length === 0 ? (
              <span className="animate-pulse">Cargando...</span>
            ) : (
              <>
                Estado del salón ({mesasFiltradas.length} mesas)
                {isLoading && (
                  <span className="text-blue-500 text-xs flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sincronizando
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          {/* --- SELECTOR DE FILTRO --- */}
          <select 
            className="bg-white border border-slate-300 text-slate-700 font-bold py-2 px-3 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={filtroSector}
            onChange={(e) => setFiltroSector(e.target.value)}
          >
            <option value="Todos">🏗️ Todos los sectores</option>
            {sectores.map((s: any) => (
              <option key={s.id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>

          <div className="h-8 w-px bg-slate-300 mx-2 hidden md:block"></div>

          {/* Botones de navegación */}
          <Link 
            href="/admin/productos" 
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm active:scale-95 text-sm"
          >
            🍔 Productos
          </Link>
          <Link 
            href="/admin/mesas" 
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm active:scale-95 text-sm"
          >
            🍽️ Mesas
          </Link>
          <Link 
            href="/admin/historial" 
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm active:scale-95 text-sm"
          >
            💰 Historial
          </Link>
          
          <button 
            onClick={() => mutate()} 
            className="bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 text-slate-600"
            title="Actualizar datos"
          >
            🔄
          </button>
          
          <button 
            onClick={cerrarSesion} 
            className="bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-200 active:scale-95 text-sm"
          >
            🚪
          </button>
        </div>
      </header>

      {/* GRILLA DE MESAS */}
      {isLoading && mesas.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
              <div className="h-24 bg-gray-50 rounded mt-4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mesasFiltradas.map((mesa: any) => (
            <div 
              key={mesa.id}
              className={`
                relative p-5 rounded-xl border-l-8 shadow-md transition-all duration-300
                ${mesa.estado === 'OCUPADA' 
                  ? 'bg-white border-red-500 shadow-red-100 transform hover:-translate-y-1' 
                  : 'bg-slate-50 border-green-400 opacity-70'}
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{mesa.nombre}</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase">{mesa.sector}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded text-white ${mesa.estado === 'OCUPADA' ? 'bg-red-500' : 'bg-green-500'}`}>
                  {mesa.estado}
                </span>
              </div>

              {mesa.estado === 'OCUPADA' ? (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Inicio:</span>
                      <span>
                        {mesa.horaInicio 
                          ? new Date(mesa.horaInicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) 
                          : '--:--'}
                      </span>
                    </div>
                    {mesa.ultimoPedido && (
                      <div className="text-xs text-slate-400 truncate bg-slate-100 p-1 rounded">
                        Último: {mesa.ultimoPedido}
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-200">
                      <span className="font-medium text-slate-600">Total:</span>
                      <span className="text-3xl font-black text-slate-900">${mesa.totalActual}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => solicitarCierre(mesa.sesionId, mesa.nombre, mesa.totalActual)}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg shadow-lg hover:bg-slate-800 active:scale-95 transition-transform flex justify-center items-center gap-2"
                  >
                    <span>💸 COBRAR</span>
                  </button>
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg">
                  Disponible
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && mesasFiltradas.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg font-medium">No hay mesas en este sector</p>
        </div>
      )}
    </div>
  );
}