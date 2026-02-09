"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Armchair, RefreshCw, Loader2, Utensils, LogOut } from "lucide-react"; // Importé LogOut
import toast, { Toaster } from "react-hot-toast";

export default function PanelMozo() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const router = useRouter();

  const cargarMesas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mozo/mesas");
      if (res.ok) {
        const data = await res.json();
        setMesas(data);
      } else {
        toast.error("Error al cargar mesas");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMesas();
    const intervalo = setInterval(cargarMesas, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const entrarAMesa = async (mesaId: number, nombreMesa: string) => {
    setAbriendo(mesaId);
    const toastId = toast.loading(`Accediendo a Mesa ${nombreMesa}...`);

    try {
      const res = await fetch("/api/mozo/abrir-mesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesaId }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Mesa abierta", { id: toastId });
        router.push(`/mesa/${data.token}`); 
      } else {
        toast.error(data.error || "Error", { id: toastId });
        setAbriendo(null);
      }
    } catch (e) {
      toast.error("Error de red", { id: toastId });
      setAbriendo(null);
    }
  };

  // FUNCIÓN DE SALIR
  const salir = () => {
    // Usamos window.location para forzar una recarga completa y limpiar estados
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-20">
      <Toaster position="top-center" />
      
      {/* Header con Botón de Salir */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                <Utensils className="text-red-600" />
                MODO MOZO
            </h1>
            <p className="text-slate-500 text-xs md:text-sm">Panel de Control</p>
        </div>

        <div className="flex gap-2">
            {/* Botón Refrescar */}
            <button 
                onClick={cargarMesas}
                disabled={loading}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors"
                title="Actualizar estado"
            >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>

            {/* 🔥 BOTÓN SALIR NUEVO */}
            <button 
                onClick={salir}
                className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 hover:bg-red-100 hover:shadow-md transition-all flex items-center gap-2 font-bold text-sm"
            >
                <LogOut size={20} />
                <span className="hidden md:inline">SALIR</span>
            </button>
        </div>
      </div>

      {/* Grilla de Mesas */}
      {loading && mesas.length === 0 ? (
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-400" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mesas.map((mesa) => (
            <button
                key={mesa.id}
                disabled={abriendo !== null}
                onClick={() => entrarAMesa(mesa.id, mesa.nombre)}
                className={`
                relative p-6 rounded-2xl border-2 shadow-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-3 h-36
                ${mesa.ocupada 
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-green-400 hover:shadow-md"}
                `}
            >
                {abriendo === mesa.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                        <Loader2 className="animate-spin text-slate-800" />
                    </div>
                )}

                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${mesa.ocupada ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></div>
                
                <Armchair size={32} strokeWidth={1.5} className={mesa.ocupada ? "opacity-100" : "opacity-50"} />
                
                <div className="text-center">
                    <span className="font-black text-2xl block">{mesa.nombre}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {mesa.ocupada ? "OCUPADA" : "LIBRE"}
                    </span>
                </div>
            </button>
            ))}
        </div>
      )}
    </div>
  );
}