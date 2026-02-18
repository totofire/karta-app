"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import useSWR from "swr";
import toast from "react-hot-toast";
import { 
  CheckCircle2, 
  GlassWater,
  Clock, 
  Printer, 
  XCircle
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      minutos > 10 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600"
    }`}>
      {minutos < 1 ? "Ahora" : `${minutos} min`}
    </span>
  );
};

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) return [];
  return res.json();
});

export default function BarraPage() {
  // 🔥 Sin refreshInterval — Supabase lo reemplaza
  const { data: pedidosRaw = [], mutate } = useSWR("/api/barra", fetcher, {
    revalidateOnFocus: true,
    fallbackData: []
  });

  const pedidos = Array.isArray(pedidosRaw) ? pedidosRaw : [];

  // 🔥 Supabase Realtime — escucha cambios en Pedido
  useEffect(() => {
    const canal = supabase
      .channel("cambios-pedidos-barra")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Pedido" },
        () => mutate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [mutate]);

  const imprimirComanda = (p: any) => {
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
      fetch('/api/admin/despachar', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: id, sector: 'barra' }),
      }).then(async (res) => {
        if (!res.ok) throw new Error("Error");
        await mutate();
      }),
      {
        loading: 'Despachando bebidas...',
        success: '¡Listo! 🍻',
        error: 'Error',
      }
    );
  };

  const cancelarPedido = async (pedidoId: number) => {
    if (!confirm("¿Cancelar pedido de bebidas?")) return;

    const pedidosRestantes = pedidos.filter((p: any) => p.id !== pedidoId);
    mutate(pedidosRestantes, false);

    toast.promise(
      fetch('/api/admin/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId })
      }).then(async (res) => {
        if (!res.ok) throw new Error("Error al cancelar");
        await mutate();
      }),
      {
        loading: 'Cancelando bebidas...',
        success: 'Bebida cancelada 🗑️',
        error: 'No se pudo cancelar',
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 w-full max-w-[100vw] overflow-x-hidden">
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
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

              {/* FOOTER ACCIONES */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => imprimirComanda(p)}
                  className="p-3 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Imprimir Ticket Barra"
                >
                  <Printer size={20} />
                </button>

                <button
                  onClick={() => cancelarPedido(p.id)}
                  className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Cancelar Pedido"
                >
                  <XCircle size={20} />
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