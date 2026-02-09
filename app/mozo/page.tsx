"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Armchair, RefreshCw, Loader2, Utensils } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function PanelMozo() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const router = useRouter();

  // Función para cargar mesas
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
    // Opcional: Polling cada 30 segundos para actualizar estado
    const intervalo = setInterval(cargarMesas, 30000);
    return () => clearInterval(intervalo);
  }, []);

  // Función mágica: Entrar a la mesa
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
        // Redirigimos al menú normal, pero con el token de esa mesa
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <Utensils className="text-red-600" />
                MODO MOZO
            </h1>
            <p className="text-slate-500 text-sm">Seleccioná una mesa para cargar pedidos</p>
        </div>
        <button 
            onClick={cargarMesas}
            disabled={loading}
            className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-red-600 transition-colors"
        >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
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
                    ? "bg-red-50 border-red-200 text-red-700" // Estilo Ocupada
                    : "bg-white border-slate-200 text-slate-600 hover:border-green-400 hover:shadow-md"} // Estilo Libre
                `}
            >
                {/* Loader individual al abrir */}
                {abriendo === mesa.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                        <Loader2 className="animate-spin text-slate-800" />
                    </div>
                )}

                {/* Indicador LED */}
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