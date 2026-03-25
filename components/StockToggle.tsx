"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function StockToggle({ usaStock }: { usaStock: boolean }) {
  const [activo, setActivo] = useState(usaStock);
  const [guardando, setGuardando] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    const nuevoValor = !activo;
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usaStock: nuevoValor }),
      });
      if (!res.ok) throw new Error();
      setActivo(nuevoValor);
      toast.success(nuevoValor ? "Control de stock activado" : "Control de stock desactivado");
      router.refresh();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4">
      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <PackageCheck size={20} className="text-blue-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Control de stock</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Activá esto para asignar cantidades a tus productos y ocultarlos cuando se agoten.
            </p>
          </div>
          <button
            onClick={toggle}
            disabled={guardando}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              activo ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                activo ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {activo && (
          <p className="text-xs text-blue-600 font-semibold mt-2">
            Activado — configurá el stock de cada producto en Gestión de Carta.
          </p>
        )}
      </div>
    </div>
  );
}
