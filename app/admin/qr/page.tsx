"use client";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code";

export default function QRPage() {
  const [mesas, setMesas] = useState<any[]>([]);

  useEffect(() => {
    // Reusamos la API de estado para obtener las mesas
    fetch("/api/admin/estado")
      .then(res => res.json())
      .then(data => setMesas(data));
  }, []);

  // Función para imprimir solo esta página
  const imprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="no-print flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-slate-800">CÓDIGOS QR 📱</h1>
        <button 
          onClick={imprimir}
          className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700"
        >
          🖨️ Imprimir
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {mesas.map((mesa) => (
          <div key={mesa.id} className="border-2 border-dashed border-gray-300 p-6 rounded-xl flex flex-col items-center justify-center text-center page-break-inside-avoid">
            <h2 className="text-2xl font-black text-slate-800 mb-4 uppercase">{mesa.nombre}</h2>
            
            <div className="bg-white p-2 rounded shadow-sm">
              <QRCode 
                value={`${window.location.origin}/mesa/${mesa.qr_token}`} 
                size={180}
              />
            </div>
            
            <p className="mt-4 text-sm text-gray-500 font-mono">
              /mesa/{mesa.qr_token}
            </p>
            <p className="mt-1 text-xs text-gray-400">Escaneá para pedir</p>
          </div>
        ))}
      </div>
      
      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
          .page-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}