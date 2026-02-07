"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  LayoutGrid,
  MapPin,
  QrCode,
  Check,
} from "lucide-react";

export default function MesasPage() {
  const [mesas, setMesas] = useState<any[]>([]);

  // --- ESTADOS SECTORES ---
  const [sectores, setSectores] = useState<any[]>([]);
  const [nuevoSector, setNuevoSector] = useState("");
  const [agregandoSector, setAgregandoSector] = useState(false);

  // --- FILTRO ---
  const [filtroSector, setFiltroSector] = useState("Todos");

  // --- FORMULARIOS ---
  const [modo, setModo] = useState<"manual" | "rapida">("manual");
  const [manual, setManual] = useState({
    nombre: "",
    qr_token: "",
    sector: "",
  });

  const [rapida, setRapida] = useState<{ cantidad: number | ""; inicio: number | ""; sector: string }>({ 
    cantidad: 10, 
    inicio: 1, 
    sector: "" 
  });

  // --- EDICIÓN ---
  const [editando, setEditando] = useState<number | null>(null);
  const [formEdit, setFormEdit] = useState({
    nombre: "",
    qr_token: "",
    sector: "",
  });

  // Carga inicial
  const cargar = async () => {
    try {
      const [resMesas, resSectores] = await Promise.all([
        fetch("/api/admin/mesas"),
        fetch("/api/admin/sectores"),
      ]);

      // 🔴 VALIDACIÓN CRÍTICA: Verificar que la respuesta sea exitosa
      if (!resMesas.ok) {
        toast.error("Error cargando mesas");
        return;
      }

      const dataMesas = await resMesas.json();
      
      // 🔴 VALIDACIÓN CRÍTICA: Asegurar que sea un array
      if (Array.isArray(dataMesas)) {
        setMesas(dataMesas);
        
        // Calcular siguiente número sugerido
        const ultimoNumero = dataMesas.reduce((max: number, m: any) => {
          const match = m.nombre.match(/(\d+)/);
          return match ? Math.max(max, parseInt(match[0])) : max;
        }, 0);
        setRapida((prev) => ({ ...prev, inicio: ultimoNumero + 1 }));
      } else {
        setMesas([]);
        toast.error("Formato de datos incorrecto");
      }

      if (resSectores.ok) {
        const dataSectores = await resSectores.json();
        if (Array.isArray(dataSectores)) {
          setSectores(dataSectores);
        }
      }

    } catch (error) {
      console.error("Error en cargar():", error);
      toast.error("Error cargando datos");
      setMesas([]); // 🔴 Asegurar que siempre sea array
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // --- ACCIONES ---

  const crearSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoSector.trim()) return;

    const res = await fetch("/api/admin/sectores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoSector }),
    });

    if (res.ok) {
      toast.success("Sector creado");
      setNuevoSector("");
      setAgregandoSector(false);
      cargar(); 
    } else {
      const data = await res.json();
      toast.error(data.error || "Error al crear");
    }
  };

  const crearManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.nombre || !manual.qr_token)
      return toast.error("Completá los datos");

    const toastId = toast.loading("Creando mesa...");
    const res = await fetch("/api/admin/mesas", {
      method: "POST",
      body: JSON.stringify({ ...manual, tipo: "manual" }),
    });

    if (res.ok) {
      toast.success("¡Mesa lista!", { id: toastId });
      setManual({ ...manual, nombre: "", qr_token: "" });
      cargar();
    } else {
      const d = await res.json();
      toast.error(d.error, { id: toastId });
    }
  };

  const crearRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rapida.cantidad === "" || rapida.inicio === "") {
        return toast.error("Ingresá cantidades válidas");
    }

    const toastId = toast.loading("Generando mesas...");
    const res = await fetch("/api/admin/mesas", {
      method: "POST",
      body: JSON.stringify({ ...rapida, tipo: "rapida" }),
    });

    if (res.ok) {
      toast.success(`Se crearon ${rapida.cantidad} mesas`, { id: toastId });
      cargar();
    } else {
      toast.error("Error al generar", { id: toastId });
    }
  };

  const guardarEdicion = async (id: number) => {
    const toastId = toast.loading("Guardando...");
    await fetch(`/api/admin/mesas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(formEdit),
    });
    toast.success("Actualizado", { id: toastId });
    setEditando(null);
    cargar();
  };

  const borrar = async (id: number) => {
    if (!confirm("¿Seguro querés borrar esta mesa?")) return;
    await fetch(`/api/admin/mesas/${id}`, { method: "DELETE" });
    toast.success("Mesa eliminada");
    cargar();
  };

  const handleNombreChange = (val: string) => {
    const token = val
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setManual({ ...manual, nombre: val, qr_token: token });
  };

  // --- AGRUPACIÓN ---
  const mesasPorSector = mesas.reduce((acc: any, mesa) => {
    const sector = mesa.sector || "General";
    if (filtroSector !== "Todos" && sector !== filtroSector) return acc;
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(mesa);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <LayoutGrid className="text-red-600" size={32} />
            Gestión de Mesas
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Administrá los códigos QR y zonas de tu local
          </p>
        </div>

        <div className="relative min-w-[200px]">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">
            Filtrar por Zona
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
            <select
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 appearance-none shadow-sm"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
            >
              <option value="Todos">Todas las zonas</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.nombre}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PANEL DE CONTROL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA 1: GESTIÓN DE SECTORES */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin size={16} /> Sectores / Zonas
          </h3>

          <div className="flex-1 content-start flex flex-wrap gap-2 mb-4">
            {sectores.map((s) => (
              <span
                key={s.id}
                className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200"
              >
                {s.nombre}
              </span>
            ))}
            {sectores.length === 0 && (
              <span className="text-gray-400 text-sm italic">
                No hay sectores creados
              </span>
            )}
          </div>

          {agregandoSector ? (
            <form
              onSubmit={crearSector}
              className="flex items-center gap-2 mt-auto"
            >
              <input
                autoFocus
                className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-red-500 transition-colors"
                placeholder="Nombre zona..."
                value={nuevoSector}
                onChange={(e) => setNuevoSector(e.target.value)}
              />
              <button
                type="submit"
                className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                onClick={() => setAgregandoSector(false)}
                className="bg-gray-200 text-gray-500 p-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAgregandoSector(true)}
              className="w-full mt-auto border-2 border-dashed border-gray-200 text-gray-400 font-bold py-2 rounded-xl hover:border-red-200 hover:text-red-500 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} /> Nuevo Sector
            </button>
          )}
        </div>

        {/* COLUMNA 2 y 3: CREADOR DE MESAS */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setModo("manual")}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${modo === "manual" ? "bg-red-50 text-red-600 border-b-2 border-red-600" : "text-gray-400 hover:bg-gray-50"}`}
            >
              <Edit2 size={16} /> Una por una
            </button>
            <button
              onClick={() => setModo("rapida")}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${modo === "rapida" ? "bg-red-50 text-red-600 border-b-2 border-red-600" : "text-gray-400 hover:bg-gray-50"}`}
            >
              <LayoutGrid size={16} /> Generación Masiva
            </button>
          </div>

          <div className="p-6">
            {modo === "manual" ? (
              <form
                onSubmit={crearManual}
                className="flex flex-col md:flex-row gap-4 items-end"
              >
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Ubicación
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-gray-700 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    value={manual.sector}
                    onChange={(e) =>
                      setManual({ ...manual, sector: e.target.value })
                    }
                  >
                    <option value="">Seleccionar...</option>
                    {sectores.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Nombre Mesa
                  </label>
                  <input
                    required
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-gray-700 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Ej: Mesa 1"
                    value={manual.nombre}
                    onChange={(e) => handleNombreChange(e.target.value)}
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Token (Auto)
                  </label>
                  <input
                    required
                    readOnly
                    className="w-full bg-gray-100 border border-gray-200 p-2.5 rounded-xl text-gray-500 text-xs font-mono outline-none cursor-not-allowed"
                    value={manual.qr_token}
                  />
                </div>
                <button className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-transform active:scale-95 shadow-md">
                  Crear
                </button>
              </form>
            ) : (
              <form
                onSubmit={crearRapida}
                className="flex flex-col md:flex-row gap-4 items-end"
              >
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Ubicación
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-gray-700 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    value={rapida.sector}
                    onChange={(e) =>
                      setRapida({ ...rapida, sector: e.target.value })
                    }
                  >
                    <option value="">Seleccionar...</option>
                    {sectores.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Cantidad a crear
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-gray-700 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    value={rapida.cantidad}
                    onChange={(e) =>
                      setRapida({
                        ...rapida,
                        cantidad: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Comenzar desde N°
                  </label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl font-bold text-gray-700 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    value={rapida.inicio}
                    onChange={(e) =>
                      setRapida({
                        ...rapida,
                        inicio: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <button className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-transform active:scale-95 shadow-md shadow-red-100">
                  Generar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* LISTADO DE MESAS */}
      {Object.keys(mesasPorSector)
        .sort()
        .map((sector) => (
          <div
            key={sector}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="flex items-center gap-3 mb-4 pl-1">
              <div className="h-8 w-1 bg-red-600 rounded-full"></div>
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                {sector}
              </h2>
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                {mesasPorSector[sector].length}
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">Nombre Mesa</th>
                    <th className="p-4 hidden sm:table-cell">
                      Código QR / Token
                    </th>
                    <th className="p-4 text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mesasPorSector[sector].map((mesa: any) => (
                    <tr
                      key={mesa.id}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      {editando === mesa.id ? (
                        <>
                          <td className="p-3 pl-6">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                className="border border-gray-300 rounded-lg p-2 text-sm font-medium focus:border-red-500 outline-none"
                                value={formEdit.sector}
                                onChange={(e) =>
                                  setFormEdit({
                                    ...formEdit,
                                    sector: e.target.value,
                                  })
                                }
                              >
                                {sectores.map((s) => (
                                  <option key={s.id} value={s.nombre}>
                                    {s.nombre}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="border border-gray-300 rounded-lg p-2 text-sm font-bold flex-1 focus:border-red-500 outline-none"
                                value={formEdit.nombre}
                                onChange={(e) =>
                                  setFormEdit({
                                    ...formEdit,
                                    nombre: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </td>
                          <td className="p-3 hidden sm:table-cell">
                            <input
                              className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono bg-gray-50"
                              value={formEdit.qr_token}
                              onChange={(e) =>
                                setFormEdit({
                                  ...formEdit,
                                  qr_token: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="p-3 pr-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => guardarEdicion(mesa.id)}
                                className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 transition-colors"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => setEditando(null)}
                                className="bg-gray-100 text-gray-500 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-black text-sm">
                                {mesa.nombre.replace(/\D/g, "") || "#"}
                              </div>
                              <span className="font-bold text-gray-700 text-base">
                                {mesa.nombre}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 hidden sm:table-cell">
                            <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-1 rounded-lg w-fit">
                              <QrCode size={14} />
                              <span className="text-xs font-mono">
                                {mesa.qr_token}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditando(mesa.id);
                                  setFormEdit(mesa);
                                }}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => borrar(mesa.id)}
                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}