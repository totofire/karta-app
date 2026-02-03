"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { CheckCircle2, ChefHat, Clock, AlertTriangle } from "lucide-react";

// Componente para evitar el error de hidratación con la hora
const Reloj = ({ fecha }: { fecha: string }) => {
  const [hora, setHora] = useState<string>("");
  
  useEffect(() => {
    setHora(new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [fecha]);

  return <span>{hora || "--:--"}</span>;
};

// Componente para el tiempo transcurrido (se actualiza solo)
const TiempoTranscurrido = ({ fecha }: { fecha: string }) => {
  const [minutos, setMinutos] = useState(0);

  useEffect(() => {
    const calcular = () => {
      const diff = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / 60000);
      setMinutos(diff);
    };
    calcular();
    const intervalo = setInterval(calcular, 60000); // Actualizar cada minuto
    return () => clearInterval(intervalo);
  }, [fecha]);

  return (
    <span className={`text-xs font-bold ${minutos > 15 ? "text-red-500 animate-pulse" : "text-yellow-500"}`}>
      Hace {minutos < 1 ? "un momento" : `${minutos} min`}
    </span>
  );
};

// Fetcher simple
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CocinaPage() {
  const { data: pedidos = [], mutate } = useSWR("/api/cocina", fetcher, {
    refreshInterval: 3000, // Polling cada 3 segundos
    revalidateOnFocus: true,
  });

  const completarPedido = async (id: number) => {
    // 🚀 ACTUALIZACIÓN OPTIMISTA
    // 1. Calculamos cómo se vería la lista SIN este pedido
    const pedidosNuevos = pedidos.filter((p: any) => p.id !== id);
    
    // 2. Actualizamos la pantalla YA (sin esperar a la API)
    mutate(pedidosNuevos, false);

    // 3. Hacemos el fetch real en background
    toast.promise(
      fetch(`/api/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "ENTREGADO" }),
      }).then(res => {
        if (!res.ok) throw new Error("Error en API");
        mutate(); // Revalidamos de verdad por si acaso
      }),
      {
        loading: 'Marchando mesa... 🍳',
        success: '¡Pedido listo! 🔔',
        error: 'No se pudo actualizar',
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-4 md:p-6">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            <ChefHat size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">COCINA KARTA</h1>
            <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
              En vivo
            </p>
          </div>
        </div>
        
        {/* Estadísticas Rápidas */}
        <div className="flex gap-4">
            <div className="bg-gray-900 px-5 py-2 rounded-xl border border-gray-800 text-center">
                <span className="block text-2xl font-black text-white">{pedidos.length}</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Pendientes</span>
            </div>
        </div>
      </header>

      {/* GRILLA DE COMANDAS */}
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 opacity-30 animate-in fade-in">
          <ChefHat size={100} className="text-gray-600 mb-6" />
          <h2 className="text-3xl font-black text-gray-500">Sin comandas</h2>
          <p className="text-gray-600 text-lg">La cocina está tranquila... por ahora.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pedidos.map((p: any) => (
            <div 
              key={p.id} 
              className="bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col relative group animate-in zoom-in-95 duration-300 hover:border-gray-700 transition-colors"
            >
              {/* Indicador de Tiempo Lateral */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 group-hover:w-2 transition-all"></div>

              {/* Cabecera Ticket */}
              <div className="p-4 border-b border-gray-800 bg-[#252525] flex justify-between items-start pl-5">
                <div>
                  <h3 className="text-xl font-black text-white leading-none mb-1">
                    Mesa {p.sesion.mesa.nombre}
                  </h3>
                  <p className="text-gray-400 text-sm font-medium truncate max-w-[150px]">
                    {p.nombreCliente || "Cliente"}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-1 bg-gray-900 px-2 py-1 rounded text-xs font-bold text-gray-300 mb-1 border border-gray-800">
                      <Clock size={12} />
                      <Reloj fecha={p.fecha} />
                   </div>
                   <TiempoTranscurrido fecha={p.fecha} />
                </div>
              </div>

              {/* Lista de Items */}
              <div className="p-5 flex-1 space-y-4 pl-5 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {p.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <span className="bg-gray-800 text-white font-black px-2 py-0.5 rounded text-lg min-w-[36px] text-center border border-gray-700">
                      {item.cantidad}
                    </span>
                    <div className="flex-1 pt-0.5">
                       <p className="font-bold text-lg text-gray-100 leading-tight">
                         {item.producto.nombre}
                       </p>
                       {item.observaciones && (
                         <div className="flex items-start gap-1 mt-1 text-yellow-500 text-sm font-medium italic">
                           <AlertTriangle size={12} className="mt-0.5" />
                           {item.observaciones}
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón Acción */}
              <button 
                onClick={() => completarPedido(p.id)}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 flex items-center justify-center gap-2 transition-all active:scale-95 text-lg uppercase tracking-wider"
              >
                <CheckCircle2 size={24} strokeWidth={3} />
                Despachar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}