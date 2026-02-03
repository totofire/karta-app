"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { 
  RefreshCcw, 
  Filter, 
  Clock, 
  DollarSign, 
  Store 
} from "lucide-react";

export default function AdminDashboard() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Filtros
  const [sectores, setSectores] = useState<any[]>([]);
  const [filtroSector, setFiltroSector] = useState("Todos");

  // --- CARGA DE DATOS ---
  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const res = await fetch("/api/admin/estado");
      const data = await res.json();
      setMesas(data);
    } catch (e) {
      console.error(e);
      if (!silencioso) toast.error("Error de conexión");
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  const cargarSectores = async () => {
    try {
      const res = await fetch("/api/admin/sectores");
      if (res.ok) setSectores(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarSectores();
    const intervalo = setInterval(() => cargarDatos(true), 10000); // Auto-refresh silencioso
    return () => clearInterval(intervalo);
  }, []);

  // --- LÓGICA DE COBRO CON TOAST CUSTOM ---
  const solicitarCierre = (sesionId: number, nombre: string, total: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[250px]">
        <div>
          <h4 className="font-bold text-gray-800">¿Cerrar {nombre}?</h4>
          <p className="text-sm text-gray-500">Total a cobrar: <b className="text-green-600">${total}</b></p>
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
        cargarDatos(true);
      } else {
        toast.error("Error al cerrar mesa", { id: toastId });
      }
    } catch (error) {
      toast.error("Error de red", { id: toastId });
    }
  };

  // --- FILTRADO ---
  const mesasFiltradas = filtroSector === "Todos" 
    ? mesas 
    : mesas.filter(m => m.sector === filtroSector);

  // --- RENDER ---
  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIOR (Título y Filtros) */}
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
          {/* Selector de Sector */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Filter size={16} />
            </div>
            <select 
              className="pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
            >
              <option value="Todos">Todos los sectores</option>
              {sectores.map(s => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={() => cargarDatos()}
            className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
            title="Actualizar datos"
          >
            <RefreshCcw size={20} className={cargando ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* GRILLA DE MESAS */}
      {mesasFiltradas.length === 0 && !cargando ? (
        <div className="text-center py-20 opacity-50">
          <Store size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">No hay mesas en este sector</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mesasFiltradas.map((mesa) => (
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
              {/* Header Card */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-800 leading-tight">
                    {mesa.nombre}
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {mesa.sector || "General"}
                  </span>
                </div>
                <span className={`
                  px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide
                  ${mesa.estado === "OCUPADA" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}
                `}>
                  {mesa.estado}
                </span>
              </div>

              {/* Contenido Card */}
              {mesa.estado === "OCUPADA" ? (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={14} className="text-gray-400" />
                      <span>
                        {new Date(mesa.horaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {mesa.ultimoPedido && (
                        <span className="ml-auto bg-gray-50 px-2 py-0.5 rounded text-[10px] text-gray-400 truncate max-w-[80px]">
                          + {mesa.ultimoPedido}
                        </span>
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
                    className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
                  >
                    <span>COBRAR</span>
                  </button>
                </>
              ) : (
                <div className="h-24 flex flex-col items-center justify-center text-gray-300 gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest">Disponible</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}