"use client";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code"; // Asegurate de tener instalada esta librería
import { Printer, QrCode as QrIcon, Download, Loader2 } from "lucide-react";
import Image from "next/image";

export default function QRPage() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    
    // Cargamos las mesas
    fetch("/api/admin/estado")
      .then((res) => res.json())
      .then((data) => {
        setMesas(data);
        setLoading(false);
      });
  }, []);

  const imprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20 print:bg-white print:p-0">
      
      {/* HEADER (Se oculta al imprimir) */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <QrIcon className="text-red-600" size={32} />
            Códigos QR
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Descargá o imprimí las tarjetas para tus mesas
          </p>
        </div>
        
        <button 
          onClick={imprimir}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2 active:scale-95"
        >
          <Printer size={20} />
          Imprimir Todo
        </button>
      </div>

      {/* CONTENIDO CARGANDO */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-red-600" size={48} />
        </div>
      )}

      {/* GRILLA DE TARJETAS */}
      {!loading && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4 print:w-full">
          {mesas.map((mesa) => (
            <div 
              key={mesa.id} 
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center text-center relative group overflow-hidden break-inside-avoid print:shadow-none print:border-2 print:border-black"
            >
              {/* Decoración superior (Solo pantalla) */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-red-500 print:hidden"></div>

              {/* Logo Karta (Marca de agua) */}
              <div className="mb-4 relative w-24 h-8 opacity-80">
                 <Image 
                   src="/logo2.png" 
                   alt="KARTA" 
                   fill 
                   className="object-contain" 
                 />
              </div>

              {/* Nombre Mesa */}
              <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">
                {mesa.nombre}
              </h2>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border border-gray-200 px-2 py-1 rounded-md print:border-black print:text-black">
                {mesa.sector || "General"}
              </span>
              
              {/* QR */}
              <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-inner mb-4 print:border-none print:shadow-none">
                <QRCode 
                  value={`${origin}/mesa/${mesa.qr_token}`} 
                  size={160}
                  level="M" // Nivel de corrección de error medio (se lee mejor rápido)
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
              
              {/* Instrucción */}
              <div className="mt-2">
                <p className="text-sm font-bold text-slate-700">Escaneá para pedir 🍔</p>
                <p className="text-[10px] text-gray-400 font-mono mt-1 print:text-black">
                  karta.menu/mesa/{mesa.qr_token}
                </p>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ESTILOS DE IMPRESIÓN ESPECÍFICOS */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: auto;
          }
          /* Ocultar elementos de navegación del navegador si es posible */
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Ocultar el sidebar del layout si no lo hicimos con Tailwind */
          aside, nav, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}