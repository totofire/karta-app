"use client";

import { useEffect } from "react";
import { ChefHat, RefreshCw } from "lucide-react";

export default function CocinaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[KDS Cocina] Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 text-white p-8">
      <div className="bg-red-600/20 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center">
        <ChefHat size={48} className="mx-auto mb-4 text-red-400 opacity-60" />
        <h2 className="text-xl font-black mb-2">KDS Cocina caído</h2>
        <p className="text-slate-400 text-sm mb-6">
          Ocurrió un error inesperado. Los pedidos siguen entrando.
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto bg-white text-slate-900 font-bold px-5 py-3 rounded-xl hover:bg-slate-100 transition-colors active:scale-95"
        >
          <RefreshCw size={16} />
          Reintentar
        </button>
      </div>
    </div>
  );
}
