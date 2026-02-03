"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [mesas, setMesas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // --- NUEVO: ESTADOS PARA FILTRO ---
  const [sectores, setSectores] = useState<any[]>([]);
  const [filtroSector, setFiltroSector] = useState("Todos");

  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/admin/estado");
      const data = await res.json();
      setMesas(data);
    } catch (e) { console.error(e); } finally { setCargando(false); }
  };

  // Cargar lista de sectores para el filtro
  const cargarSectores = async () => {
    try {
      const res = await fetch("/api/admin/sectores");
      if (res.ok) setSectores(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    cargarDatos();
    cargarSectores(); // Cargamos los sectores al inicio
    const intervalo = setInterval(cargarDatos, 10000);
    return () => clearInterval(intervalo);
  }, []);

  const cerrarMesa = async (sesionId: number, nombre: string, total: number) => {
    if (!confirm(`¿Cerrar mesa ${nombre}?\n\n💰 TOTAL: $${total}`)) return;
    setCargando(true);
    await fetch("/api/admin/cerrar", { method: "POST", body: JSON.stringify({ sesionId }) });
    cargarDatos();
  };

  const cerrarSesion = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  // --- LÓGICA DE FILTRADO ---
  const mesasFiltradas = filtroSector === "Todos" 
    ? mesas 
    : mesas.filter(m => m.sector === filtroSector);

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-20">
      <header className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">CONTROL</h1>
          <p className="text-slate-500 text-sm">
            {cargando ? "Actualizando..." : `Estado del salón (${mesasFiltradas.length} mesas)`}
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
            {sectores.map(s => (
              <option key={s.id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>

          <div className="h-8 w-px bg-slate-300 mx-2 hidden md:block"></div>

          {/* Botones de navegación (Igual que antes) */}
          <Link href="/admin/productos" className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm active:scale-95 text-sm">
            🍔 Productos
          </Link>
          <Link href="/admin/mesas" className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm active:scale-95 text-sm">
            🍽️ Mesas
          </Link>
          <Link href="/admin/historial" className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm active:scale-95 text-sm">
            💰 Historial
          </Link>
          <button onClick={cargarDatos} className="bg-white border border-slate-300 px-3 py-2 rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 text-slate-600">
            🔄
          </button>
          <button onClick={cerrarSesion} className="bg-red-100 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-200 active:scale-95 text-sm">
            🚪
          </button>
        </div>
      </header>

      {/* GRILLA DE MESAS (Usamos mesasFiltradas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mesasFiltradas.map((mesa) => (
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
                    <span>{mesa.horaInicio ? new Date(mesa.horaInicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
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
                  onClick={() => cerrarMesa(mesa.sesionId, mesa.nombre, mesa.totalActual)}
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
    </div>
  );
}