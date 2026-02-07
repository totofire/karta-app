"use client";
import { useState, useMemo } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import Link from "next/link";
import { 
  RefreshCcw, 
  Filter, 
  Clock, 
  DollarSign, 
  Store, 
  Printer, 
  CheckCircle2, 
  X, 
  HandCoins,
  Map,        
  LayoutGrid,
  PenTool 
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then(async (res) => {
    if (!res.ok) return []; // Si falla (ej: 401), devuelve array vacío
    return res.json();
});

export default function AdminDashboard() {
  const [filtroSector, setFiltroSector] = useState("Todos");
  const [mesaParaCobrar, setMesaParaCobrar] = useState<any>(null); 
  const [vistaMapa, setVistaMapa] = useState(false);

  // Data fetching con SWR
  const { data: mesas = [], mutate, isLoading: cargando } = useSWR('/api/admin/estado', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    fallbackData: [] // Valor inicial seguro
  });
  
  const { data: sectoresRaw } = useSWR('/api/admin/sectores', fetcher, {
    fallbackData: []
  });

  // Aseguramos que sectores sea siempre un array
  const sectores = Array.isArray(sectoresRaw) ? sectoresRaw : [];

  // --- FUNCIÓN DE IMPRESIÓN ---
  const imprimirTicketCierre = (mesa: any) => {
    const ventana = window.open('', 'PRINT', 'height=600,width=400');
    if (ventana) {
        ventana.document.write(`
            <html>
                <head>
                    <title>Ticket Mesa ${mesa.nombre}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 10px; width: 300px; margin: 0 auto; text-transform: uppercase; }
                        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                        .title { font-size: 20px; font-weight: bold; margin: 0; }
                        .subtitle { font-size: 14px; margin-top: 5px; }
                        .meta { font-size: 12px; margin-top: 5px; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
                        .total-row { border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; }
                        .footer { text-align: center; font-size: 10px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 class="title">KARTA RESTO</h1>
                        <div class="subtitle">PRE-CUENTA</div>
                        <div class="meta">MESA: ${mesa.nombre}</div>
                        <div class="meta">FECHA: ${new Date().toLocaleString()}</div>
                    </div>
                    
                    <div class="items">
                        ${mesa.detalles ? mesa.detalles.map((d: any) => `
                            <div class="item">
                                <span>${d.cantidad} x ${d.producto}</span>
                                <span>$${d.subtotal}</span>
                            </div>
                        `).join('') : '<div style="text-align:center; margin:10px 0;">Detalle no disponible</div>'}
                    </div>

                    <div class="total-row">
                        <span>TOTAL A PAGAR</span>
                        <span>$${mesa.totalActual}</span>
                    </div>

                    <div class="footer">NO VALIDO COMO FACTURA<br/>GRACIAS POR SU VISITA</div>
                </body>
            </html>
        `);
        ventana.document.close();
        ventana.focus();
        ventana.print();
        ventana.close();
    }
  };

  // --- COBRO ---
  const ejecutarCierre = async () => {
    if (!mesaParaCobrar) return;
    const toastId = toast.loading("Cerrando mesa...");
    try {
      const res = await fetch("/api/admin/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId: mesaParaCobrar.sesionId }),
      });

      if (res.ok) {
        toast.success("Mesa cerrada 💰", { id: toastId });
        mutate(); 
        setMesaParaCobrar(null);
      } else {
        toast.error("Error al cerrar", { id: toastId });
      }
    } catch (error) {
      toast.error("Error de conexión", { id: toastId });
    }
  };

  // Filtrado seguro (validando que mesas sea array)
  const mesasFiltradas = useMemo(() => {
    if (!Array.isArray(mesas)) return [];
    return filtroSector === "Todos" 
      ? mesas 
      : mesas.filter((m: any) => m.sector === filtroSector);
  }, [mesas, filtroSector]);

  return (
    <div className="space-y-6 relative h-full flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm z-20">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Store className="text-red-600" size={24} />
            Control de Salón
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">
            {cargando ? "Sincronizando..." : `${mesasFiltradas.length} mesas activas`}
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          
          <Link href="/admin/mesas/mapa">
            <button 
                className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-colors shadow-sm group active:scale-95"
                title="Editar distribución de mesas"
            >
                <PenTool size={18} className="group-hover:scale-110 transition-transform" />
            </button>
          </Link>

          <button 
            onClick={() => setVistaMapa(!vistaMapa)}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-bold flex gap-2 items-center text-gray-700 transition-colors shadow-sm active:scale-95"
          >
             {vistaMapa ? <LayoutGrid size={18}/> : <Map size={18}/>}
             <span className="hidden sm:inline">{vistaMapa ? "Ver Lista" : "Ver Mapa"}</span>
          </button>

          <div className="relative group flex-1 sm:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Filter size={16} /></div>
            <select 
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base md:text-sm font-bold text-gray-700 outline-none cursor-pointer hover:bg-gray-100 transition-colors appearance-none"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
            >
              <option value="Todos">Todos los sectores</option>
              {sectores.map((s: any) => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <button onClick={() => mutate()} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95 shadow-sm">
            <RefreshCcw size={20} className={cargando ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {vistaMapa ? (
        
        /* --- VISTA MAPA --- */
        <div className="relative w-full h-[600px] md:h-[700px] bg-gray-100 rounded-3xl border border-gray-200 shadow-inner overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            {mesasFiltradas.map((mesa: any) => (
                <div
                    key={mesa.id}
                    style={{ transform: `translate(${mesa.posX || 0}px, ${mesa.posY || 0}px)` }} 
                    className="absolute transition-all duration-500 ease-in-out" 
                >
                    <div 
                        onClick={() => mesa.estado === "OCUPADA" ? setMesaParaCobrar(mesa) : null}
                        className={`
                            w-20 h-20 md:w-24 md:h-24 rounded-2xl shadow-md border-2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform relative bg-white
                            ${mesa.solicitaCuenta 
                                ? "bg-yellow-50 border-yellow-500 shadow-yellow-200 ring-4 ring-yellow-200 ring-opacity-50 animate-pulse z-50" 
                                : mesa.estado === "OCUPADA" 
                                    ? "bg-white border-red-500 text-red-600 z-10" 
                                    : "bg-gray-50 border-gray-300 text-gray-400 opacity-60"
                            }
                        `}
                    >
                        {mesa.solicitaCuenta && (
                            <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-full animate-bounce whitespace-nowrap shadow-lg flex items-center gap-1 z-50">
                                <HandCoins size={12} className="md:w-3.5 md:h-3.5" />
                                PIDE CUENTA
                            </div>
                        )}

                        <span className="font-black text-base md:text-xl">{mesa.nombre}</span>
                        
                        {mesa.estado === "OCUPADA" && (
                            <span className="text-[10px] md:text-xs font-bold mt-1 text-black bg-gray-100 px-1.5 md:px-2 rounded-md border border-gray-200">
                                ${mesa.totalActual}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>

      ) : (

        /* --- VISTA GRILLA --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
            {mesasFiltradas.map((mesa: any) => (
            <div
                key={mesa.id}
                className={`
                relative p-5 rounded-2xl border transition-all duration-300
                ${mesa.solicitaCuenta 
                    ? "bg-yellow-50 border-yellow-400 shadow-xl shadow-yellow-100 ring-2 ring-yellow-400 ring-offset-2 animate-pulse" 
                    : mesa.estado === "OCUPADA"
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
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide 
                    ${mesa.solicitaCuenta ? "bg-yellow-400 text-yellow-900" : mesa.estado === "OCUPADA" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}
                `}>
                    {mesa.solicitaCuenta ? "PIDIENDO" : mesa.estado}
                </span>
                </div>

                {mesa.solicitaCuenta && (
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-2 rounded-lg font-black text-xs uppercase tracking-wide mb-4 flex items-center gap-2 justify-center animate-bounce shadow-sm">
                        <HandCoins size={18} />
                        ¡PIDE CUENTA!
                    </div>
                )}

                {mesa.estado === "OCUPADA" ? (
                <>
                    <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={14} className="text-gray-400" />
                        <span>{new Date(mesa.horaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                    onClick={() => setMesaParaCobrar(mesa)}
                    className={`w-full py-2.5 text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all
                        ${mesa.solicitaCuenta ? "bg-yellow-500 hover:bg-yellow-600 text-yellow-950" : "bg-gray-900 hover:bg-black"}
                    `}
                    >
                    COBRAR MESA
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

      {/* --- MODAL DE COBRO --- */}
      {mesaParaCobrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-red-600 p-6 text-white text-center relative">
                <button onClick={() => setMesaParaCobrar(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95"><X size={20} /></button>
                <h3 className="text-2xl font-black uppercase tracking-tight">Mesa {mesaParaCobrar.nombre}</h3>
                <p className="text-red-100 text-sm font-medium">Seleccioná una acción</p>
            </div>
            <div className="p-8 space-y-6">
                <div className="text-center">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total a cobrar</span>
                    <div className="text-5xl font-black text-gray-900 mt-2">${mesaParaCobrar.totalActual}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => imprimirTicketCierre(mesaParaCobrar)} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group active:scale-95">
                        <Printer size={32} className="text-gray-400 group-hover:text-gray-600" />
                        <span className="font-bold text-gray-600 text-sm">Imprimir Ticket</span>
                    </button>
                    <button onClick={ejecutarCierre} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 border-2 border-green-100 hover:bg-green-100 hover:border-green-200 transition-all group active:scale-95">
                        <CheckCircle2 size={32} className="text-green-600 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-green-700 text-sm">Cerrar y Liberar</span>
                    </button>
                </div>
            </div>
            <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 font-medium">Al cerrar, la mesa quedará disponible para nuevos clientes.</div>
          </div>
        </div>
      )}

    </div>
  );
}