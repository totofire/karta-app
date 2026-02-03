"use client";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import toast, { Toaster } from "react-hot-toast";
import { 
  CheckCircle2, 
  GlassWater, 
  Clock, 
  Printer, 
  AlertCircle,
  BellRing // Ícono
} from "lucide-react";

// ... (Componentes Reloj y TiempoTranscurrido igual que antes) ...
const Reloj = ({ fecha }: { fecha: string }) => {
  const [hora, setHora] = useState<string>("");
  useEffect(() => {
    setHora(new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [fecha]);
  return <span>{hora}</span>;
};

const TiempoTranscurrido = ({ fecha }: { fecha: string }) => {
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

  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
      minutos > 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600"
    }`}>
      {minutos < 1 ? "Ahora" : `${minutos} min`}
    </span>
  );
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BarraPage() {
  const { data: pedidos = [], mutate } = useSWR("/api/barra", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  // --- LÓGICA DE NOTIFICACIONES BARRA ---
  const pedidosRef = useRef<number[]>([]);
  const primeraCarga = useRef(true);

  useEffect(() => {
    if (pedidos.length > 0) {
      const idsActuales = pedidos.map((p: any) => p.id);
      
      if (!primeraCarga.current) {
        const nuevos = pedidos.filter((p: any) => !pedidosRef.current.includes(p.id));
        
        if (nuevos.length > 0) {
          // 1. Sonido
          const audio = new Audio("/sounds/ding.mp3");
          audio.play().catch(() => {});

          // 2. Cartel Azul
          nuevos.forEach((p: any) => {
            toast.custom((t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-blue-600`}>
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <GlassWater className="h-6 w-6 text-blue-600 animate-bounce" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-lg font-black text-gray-900">
                        ¡BEBIDAS NUEVAS! 🍹
                      </p>
                      <p className="mt-1 text-sm text-gray-500 font-bold">
                        Mesa {p.sesion.mesa.nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {p.items.length} items
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-blue-600 hover:text-blue-500 focus:outline-none"
                  >
                    Visto
                  </button>
                </div>
              </div>
            ), { duration: 8000, position: 'top-right' });
          });
        }
      } else {
        primeraCarga.current = false;
      }
      pedidosRef.current = idsActuales;
    }
  }, [pedidos]);

  const imprimirComanda = (p: any) => {
    // ... (Tu código de impresión igual) ...
    const ventana = window.open('', 'PRINT', 'height=600,width=400');
    if (ventana) {
        ventana.document.write(`
            <html>
                <head>
                    <title>BARRA - Mesa ${p.sesion.mesa.nombre}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 10px; width: 300px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .title { font-size: 20px; font-weight: bold; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 16px; font-weight: bold; }
                        .footer { border-top: 2px dashed #000; padding-top: 10px; text-align: center; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">🍸 BARRA: MESA ${p.sesion.mesa.nombre}</div>
                        <div>${p.nombreCliente || 'Cliente'}</div>
                    </div>
                    ${p.items.map((item: any) => `
                        <div class="item">
                            <span>${item.cantidad}x</span>
                            <span>${item.producto.nombre}</span>
                        </div>
                    `).join('')}
                    <div class="footer">KARTA BAR</div>
                </body>
            </html>
        `);
        ventana.document.close();
        ventana.focus();
        ventana.print();
        ventana.close();
    }
  };

  const completarPedido = async (id: number) => {
    const pedidosNuevos = pedidos.filter((p: any) => p.id !== id);
    mutate(pedidosNuevos, false);
    toast.promise(
      fetch(`/api/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "ENTREGADO" }),
      }).then(() => mutate()),
      { loading: 'Despachando...', success: '¡Listo!', error: 'Error' }
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      <Toaster />
      
      {/* HEADER AZUL */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b border-slate-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 w-12 h-12 flex items-center justify-center rounded-xl shadow-lg shadow-blue-900/50">
            <GlassWater size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Barra & Bebidas</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              En vivo
            </p>
          </div>
        </div>
        
        <div className="bg-slate-800 px-6 py-2 rounded-xl border border-slate-700 text-center shadow-sm">
            <span className="block text-3xl font-black text-white">{pedidos.length}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pendientes</span>
        </div>
      </header>

      {/* GRILLA */}
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 opacity-20 animate-in fade-in">
          <GlassWater size={120} className="text-white mb-6" />
          <h2 className="text-3xl font-black text-white tracking-tighter">BARRA LIBRE</h2>
          <p className="text-white text-lg font-medium">Nada para preparar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pedidos.map((p: any) => (
            <div 
              key={p.id} 
              className="relative flex flex-col rounded-xl overflow-hidden shadow-xl bg-white border-l-8 border-blue-500 animate-in zoom-in-95"
            >
              <div className="p-4 border-b border-dashed border-gray-300 flex justify-between items-start bg-gray-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-none mb-1">
                    Mesa {p.sesion.mesa.nombre}
                  </h3>
                  <p className="text-slate-500 text-xs font-bold uppercase truncate max-w-[120px]">
                    {p.nombreCliente}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                   <TiempoTranscurrido fecha={p.fecha} />
                   <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                      <Clock size={10} />
                      <Reloj fecha={p.fecha} />
                   </div>
                </div>
              </div>

              <div className="p-5 flex-1 space-y-3 bg-white">
                {p.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-center border-b border-gray-100 pb-2 last:border-0">
                    <span className="bg-blue-100 text-blue-800 font-black px-2 py-1 rounded text-lg min-w-[35px] text-center">
                      {item.cantidad}
                    </span>
                    <div className="flex-1">
                       <p className="font-bold text-lg text-slate-800 leading-tight">
                         {item.producto.nombre}
                       </p>
                       {item.observaciones && (
                         <span className="text-xs text-blue-600 font-bold italic block mt-1">
                           {item.observaciones}
                         </span>
                       )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                <button 
                  onClick={() => imprimirComanda(p)}
                  className="p-3 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Imprimir Ticket Barra"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => completarPedido(p.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-sm tracking-wide"
                >
                  <CheckCircle2 size={18} />
                  LISTO
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}