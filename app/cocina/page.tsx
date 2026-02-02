"use client";
import { useState, useEffect } from "react";

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);

  // Función para buscar pedidos nuevos
  const cargarPedidos = async () => {
    // Truco rápido: Creamos una API on-the-fly o usamos un server action. 
    // Para simplificar, asumimos que creaste un GET en /api/cocina o filtramos aquí.
    // MODO RÁPIDO: Usamos un fetch directo a una ruta nueva que haremos abajo.
    const res = await fetch("/api/cocina");
    if (res.ok) {
      const data = await res.json();
      setPedidos(data);
    }
  };

  // Auto-refresh cada 5 segundos
  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const completarPedido = async (id: number) => {
    if(!confirm("¿Ya salió este pedido?")) return;
    
    await fetch(`/api/pedidos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ estado: "ENTREGADO" }),
    });
    cargarPedidos(); // Recargar ya
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6 flex justify-between">
        👨‍🍳 COMANDAS EN MARCHA
        <span className="text-sm bg-slate-700 px-3 py-1 rounded-full animate-pulse">
          Actualizando...
        </span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pedidos.length === 0 && (
          <p className="text-gray-500 italic">No hay pedidos pendientes...</p>
        )}

        {pedidos.map((p) => (
          <div key={p.id} className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-lg border-l-8 border-yellow-400">
            {/* Cabecera del Ticket */}
            <div className="bg-gray-100 p-3 flex justify-between items-center border-b">
              <div>
                <span className="block font-black text-xl">MESA {p.sesion.mesa.nombre}</span>
                <span className="text-sm text-gray-500">{p.nombreCliente}</span>
              </div>
              <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                {new Date(p.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>

            {/* Lista de Items */}
            <div className="p-4 space-y-2">
              {p.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-1">
                  <span className="font-bold text-lg">{item.cantidad}x</span>
                  <span className="flex-1 ml-2 font-medium leading-tight">
                    {item.producto.nombre}
                  </span>
                </div>
              ))}
            </div>

            {/* Botón de Acción */}
            <button 
              onClick={() => completarPedido(p.id)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg transition-colors"
            >
              ✅ LISTO PARA LLEVAR
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}