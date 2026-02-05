"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { 
  CheckCircle2, 
  ChefHat, 
  Clock, 
  Printer, 
  AlertCircle 
} from "lucide-react";

// --- COMPONENTES AUXILIARES ---

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
      minutos > 15 ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-500"
    }`}>
      {minutos < 1 ? "Ahora" : `${minutos} min`}
    </span>
  );
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- PÁGINA PRINCIPAL ---

export default function CocinaPage() {
  // Nota: Asegúrate de que /api/cocina devuelva SOLO los items de cocina pendientes
  // Si tu API actual devuelve todo el pedido, el filtro visual se hará aquí, 
  // pero lo ideal es que el backend ya filtre.
  const { data: pedidos = [], mutate } = useSWR("/api/cocina", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  // Función de impresión térmica
  const imprimirComanda = async (p: any) => {
    // 1. Abrir ventana de impresión (formato ticket 80mm)
    const ventana = window.open('', 'PRINT', 'height=600,width=400');
    if (ventana) {
        ventana.document.write(`
            <html>
                <head>
                    <title>Comanda ${p.sesion.mesa.nombre}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 10px; width: 300px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .title { font-size: 20px; font-weight: bold; }
                        .meta { font-size: 12px; margin-top: 5px; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: bold; }
                        .qty { margin-right: 10px; }
                        .note { font-size: 12px; font-style: italic; margin-left: 25px; margin-bottom: 5px; }
                        .footer { border-top: 2px dashed #000; padding-top: 10px; text-align: center; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">MESA ${p.sesion.mesa.nombre}</div>
                        <div class="meta">Mozo/Cliente: ${p.nombreCliente || 'Anónimo'}</div>
                        <div class="meta">Hora: ${new Date(p.fecha).toLocaleTimeString()}</div>
                    </div>
                    ${p.items.map((item: any) => `
                        <div class="item">
                            <span class="qty">${item.cantidad}x</span>
                            <span>${item.producto.nombre}</span>
                        </div>
                        ${item.observaciones ? `<div class="note">( ${item.observaciones} )</div>` : ''}
                    `).join('')}
                    <div class="footer">
                        KARTA - CONTROL COCINA
                    </div>
                </body>
            </html>
        `);
        ventana.document.close();
        ventana.focus();
        ventana.print();
        ventana.close();
    }

    // 2. Marcar como impreso en la base de datos
    if (!p.impreso) {
        await fetch(`/api/pedidos/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ impreso: true }),
        });
        mutate();
        toast.success("Marcado como impreso");
    }
  };

  // --- LÓGICA DE DESPACHO POR SECTOR (NUEVO) ---
  const despacharCocina = async (pedidoId: number) => {
    // UI Optimista: Eliminamos el pedido de la lista visualmente al instante
    const pedidosRestantes = pedidos.filter((p: any) => p.id !== pedidoId);
    mutate(pedidosRestantes, false);

    toast.promise(
      fetch('/api/admin/despachar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pedidoId, 
          sector: 'cocina' // <--- ESTO ES LA CLAVE: Solo despacha items de cocina
        })
      }).then(async (res) => {
        if (!res.ok) throw new Error("Error al despachar");
        // Revalidamos los datos reales del servidor
        await mutate();
      }),
      {
        loading: 'Despachando cocina...',
        success: '¡Platos listos! 🍳',
        error: 'Error al conectar',
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6">
      
      {/* HEADER TIPO KDS */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b border-slate-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 w-12 h-12 flex items-center justify-center rounded-xl shadow-lg shadow-red-900/50">
            <ChefHat size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">KDS Cocina</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              En línea
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-slate-800 px-6 py-2 rounded-xl border border-slate-700 text-center shadow-sm">
                <span className="block text-3xl font-black text-white">{pedidos.length}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pendientes</span>
            </div>
        </div>
      </header>

      {/* GRILLA DE COMANDAS */}
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 opacity-20 animate-in fade-in">
          <ChefHat size={120} className="text-white mb-6" />
          <h2 className="text-3xl font-black text-white tracking-tighter">SIN COMANDAS</h2>
          <p className="text-white text-lg font-medium">Todo despachado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pedidos.map((p: any) => (
            <div 
              key={p.id} 
              className={`
                relative flex flex-col rounded-xl overflow-hidden shadow-xl transition-all duration-300 animate-in zoom-in-95
                ${p.impreso ? "bg-gray-200 border-2 border-slate-600" : "bg-white border-l-8 border-red-500"}
              `}
            >
              
              {/* CABECERA TICKET */}
              <div className="p-4 border-b border-dashed border-gray-300 flex justify-between items-start bg-gray-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-none mb-1">
                    Mesa {p.sesion.mesa.nombre}
                  </h3>
                  <p className="text-slate-500 text-xs font-bold uppercase truncate max-w-[120px]">
                    {p.nombreCliente || "Cliente"}
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

              {/* CUERPO TICKET (Items) */}
              <div className="p-5 flex-1 space-y-3 bg-white">
                {p.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-base min-w-[30px] text-center">
                      {item.cantidad}
                    </span>
                    <div className="flex-1 pt-0.5">
                        <p className="font-bold text-lg text-slate-800 leading-tight">
                          {item.producto.nombre}
                        </p>
                        {item.observaciones && (
                          <div className="flex items-start gap-1 mt-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold border border-yellow-100">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            {item.observaciones}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {/* FOOTER ACCIONES */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                <button 
                  onClick={() => imprimirComanda(p)}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors border-2 
                    ${p.impreso 
                        ? "bg-transparent border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400" 
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                    }`}
                  title="Imprimir comanda"
                >
                  <Printer size={18} />
                  {p.impreso ? "Re-Imprimir" : "Imprimir"}
                </button>
                
                <button 
                  onClick={() => despacharCocina(p.id)} // <--- NUEVA FUNCIÓN
                  className="flex-[2] bg-slate-900 hover:bg-green-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-sm tracking-wide group"
                >
                  <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform"/>
                  LISTO
                </button>
              </div>

              {/* SELLO DE IMPRESO */}
              {p.impreso && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-slate-300/30 text-slate-300/30 font-black text-4xl uppercase -rotate-12 p-4 rounded-xl pointer-events-none select-none z-10 backdrop-blur-[1px]">
                  IMPRESA
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}