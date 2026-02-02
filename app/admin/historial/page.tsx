"use client";
import { useState, useEffect } from "react";

export default function HistorialPage() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca las sesiones cerradas desde la API
    fetch("/api/admin/historial")
      .then((res) => res.json())
      .then((data) => {
        setVentas(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error cargando historial:", err));
  }, []);

  // Suma total de todas las ventas mostradas
  const recaudacionTotal = ventas.reduce((acc, venta) => acc + venta.totalVenta, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-6 pb-20">
      <h1 className="text-3xl font-black text-slate-800 mb-2">HISTORIAL DE CAJA 💰</h1>
      <p className="text-slate-500 mb-8">Registro de todas las mesas cerradas y cobradas.</p>

      {/* TARJETA DE RECAUDACIÓN TOTAL */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-8 flex justify-between items-center">
        <div>
          <p className="text-slate-400 text-sm uppercase font-bold tracking-wider">Recaudación Total</p>
          <p className="text-4xl font-black mt-1">${recaudacionTotal.toLocaleString()}</p>
        </div>
        <div className="text-4xl">🏆</div>
      </div>

      {/* TABLA DE MOVIMIENTOS */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Mesa</th>
                <th className="p-4">Hora Cierre</th>
                <th className="p-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 animate-pulse">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                    Todavía no cobraste ninguna mesa.
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-700">
                      {new Date(venta.fechaFin).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-600 font-bold">
                      {venta.mesa.nombre}
                    </td>
                    <td className="p-4 text-slate-400 text-sm font-mono">
                      {new Date(venta.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-4 text-right font-black text-green-600 text-lg">
                      ${venta.totalVenta.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}