"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; // Importante para navegar a Productos e Historial
import { useRouter } from "next/navigation"; // <--- AGREGAR ESTO
export default function AdminDashboard() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();
  // Función para traer los datos del estado actual
  const cargarDatos = async () => {
    try {
      const res = await fetch("/api/admin/estado");
      const data = await res.json();
      setMesas(data);
    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setCargando(false);
    }
  };

  // Auto-refresh: Se actualiza solo cada 10 segundos
  useEffect(() => {
    cargarDatos();
    const intervalo = setInterval(cargarDatos, 10000);
    return () => clearInterval(intervalo);
  }, []);
  const cerrarSesion = async () => {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login"); // Nos manda al login
    };
  // Función para cobrar y cerrar mesa
  const cerrarMesa = async (sesionId: number, nombre: string, total: number) => {
    const confirmacion = window.confirm(`¿Cerrar mesa ${nombre}?\n\n💰 TOTAL A COBRAR: $${total}`);
    if (!confirmacion) return;

    // Ponemos la mesa en estado de "cargando" visualmente
    setCargando(true);
    
    try {
      const res = await fetch("/api/admin/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId }),
      });

      if (res.ok) {
        alert("✅ Mesa cerrada y cobrada correctamente.");
        cargarDatos(); // Recargar datos frescos
      } else {
        alert("❌ Error al cerrar la mesa.");
        setCargando(false);
      }
    } catch (error) {
      alert("❌ Error de conexión");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-20">
      {/* Encabezado */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">CONTROL</h1>
          <p className="text-slate-500 text-sm">Estado del salón en vivo</p>
        </div>
        
        {/* Botonera de Acciones */}
        <div className="flex gap-2">
          <Link 
            href="/admin/productos" 
            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            🍔 Productos
          </Link>

          <Link 
            href="/admin/historial" 
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            💰 Historial
          </Link>
          <Link 
            href="/admin/cocina" 
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            🍳 Cocina
          </Link>
          <button 
            onClick={cargarDatos}
            className="bg-white border border-slate-300 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 active:scale-95 transition-transform font-bold text-slate-600"
          >
            🔄
          </button>
          <button 
            onClick={cerrarSesion}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Grilla de Mesas */}
      {cargando && mesas.length === 0 ? (
        <div className="text-center py-10 text-slate-400 animate-pulse">Cargando estado...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mesas.map((mesa) => (
            <div 
              key={mesa.id}
              className={`
                relative p-5 rounded-xl border-l-8 shadow-md transition-all duration-300
                ${mesa.estado === 'OCUPADA' 
                  ? 'bg-white border-red-500 shadow-red-100 transform hover:-translate-y-1' 
                  : 'bg-slate-50 border-green-400 opacity-70'}
              `}
            >
              {/* Info Principal */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-800">{mesa.nombre}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded text-white ${mesa.estado === 'OCUPADA' ? 'bg-red-500' : 'bg-green-500'}`}>
                  {mesa.estado}
                </span>
              </div>

              {/* Detalles si está ocupada */}
              {mesa.estado === 'OCUPADA' ? (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Inicio:</span>
                      <span>{new Date(mesa.horaInicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
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

                  {/* Botón de Cobrar */}
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
      )}
    </div>
  );
}