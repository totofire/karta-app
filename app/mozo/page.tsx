"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Armchair, RefreshCw, Loader2, Utensils, LogOut, Clock, DollarSign } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Componente de tiempo transcurrido
const TiempoMesa = ({ fecha }: { fecha: string }) => {
  const [minutos, setMinutos] = useState(0);

  useEffect(() => {
    const calcular = () => {
      const diff = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / 60000);
      setMinutos(diff);
    };
    calcular();
    const intervalo = setInterval(calcular, 60000);
    return () => clearInterval(intervalo);
  }, [fecha]);

  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  const texto = horas > 0 ? `${horas}h ${mins}m` : `${minutos}m`;
  const urgente = minutos > 90;

  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${urgente ? "text-red-500" : "text-slate-400"}`}>
      <Clock size={12} />
      {texto}
    </span>
  );
};

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

  const salir = () => { window.location.href = "/api/logout"; };

  const mesasLibres = mesas.filter(m => !m.ocupada);
  const mesasOcupadas = mesas.filter(m => m.ocupada);

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Utensils className="text-red-600" />
            MODO MOZO
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">
            {mesasOcupadas.length} ocupadas · {mesasLibres.length} libres
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargarMesas}
            disabled={loading}
            className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={salir}
            className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 hover:bg-red-100 transition-all flex items-center gap-2 font-bold text-sm"
          >
            <LogOut size={20} />
            <span className="hidden md:inline">SALIR</span>
          </button>
        </div>
      </div>

      {loading && mesas.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={40} />
        </div>
      ) : (
        <div className="space-y-6">

          {/* MESAS OCUPADAS */}
          {mesasOcupadas.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">
                Ocupadas ({mesasOcupadas.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mesasOcupadas.map((mesa) => (
                  <button
                    key={mesa.id}
                    disabled={abriendo !== null}
                    onClick={() => entrarAMesa(mesa.id, mesa.nombre)}
                    className="relative p-4 rounded-2xl border-2 shadow-sm transition-all active:scale-95 flex flex-col gap-2 bg-white border-red-200 text-left hover:shadow-md hover:-translate-y-0.5"
                  >
                    {abriendo === mesa.id && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                        <Loader2 className="animate-spin text-slate-800" />
                      </div>
                    )}

                    {/* Indicador + Nombre */}
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xl text-slate-800">{mesa.nombre}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                    </div>

                    {/* Sector */}
                    {mesa.sector && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {mesa.sector}
                      </span>
                    )}

                    {/* Separador */}
                    <div className="border-t border-dashed border-slate-100 my-1"></div>

                    {/* Total */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-green-600 font-black text-lg">
                        <DollarSign size={16} strokeWidth={3} />
                        {mesa.totalActual.toLocaleString()}
                      </div>
                      {mesa.horaInicio && <TiempoMesa fecha={mesa.horaInicio} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MESAS LIBRES */}
          {mesasLibres.length > 0 && (
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">
                Libres ({mesasLibres.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mesasLibres.map((mesa) => (
                  <button
                    key={mesa.id}
                    disabled={abriendo !== null}
                    onClick={() => entrarAMesa(mesa.id, mesa.nombre)}
                    className="relative p-4 rounded-2xl border-2 border-dashed border-slate-200 shadow-sm transition-all active:scale-95 flex flex-col gap-2 bg-white text-left hover:border-green-300 hover:shadow-md opacity-70 hover:opacity-100"
                  >
                    {abriendo === mesa.id && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
                        <Loader2 className="animate-spin text-slate-800" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xl text-slate-500">{mesa.nombre}</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                    {mesa.sector && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {mesa.sector}
                      </span>
                    )}
                    <span className="text-xs text-slate-300 font-medium mt-1">Disponible</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}