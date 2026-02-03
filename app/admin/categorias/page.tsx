"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChefHat,
  ArrowUp01,
  Type
} from "lucide-react";

// 1. Definimos el tipo para permitir borrar el número (string vacío)
type CategoriaForm = {
  nombre: string;
  orden: number | ""; // <--- Esto soluciona el error de TypeScript
  imprimirCocina: boolean;
};

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false); // Para mostrar/ocultar formulario
  const [editando, setEditando] = useState<number | null>(null);

  // Estado para nueva categoría
  const [nueva, setNueva] = useState<CategoriaForm>({
    nombre: "",
    orden: 10,
    imprimirCocina: true,
  });

  // Estado para edición
  const [formEdit, setFormEdit] = useState<CategoriaForm>({
    nombre: "",
    orden: 0,
    imprimirCocina: true,
  });

  const cargar = async () => {
    try {
      const res = await fetch("/api/admin/categorias");
      if (res.ok) {
        setCategorias(await res.json());
      }
    } catch (e) {
      toast.error("Error al cargar categorías");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nueva.nombre.trim() || nueva.orden === "") return toast.error("Datos incompletos");

    const toastId = toast.loading("Creando...");
    const res = await fetch("/api/admin/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });

    if (res.ok) {
      toast.success("Categoría creada", { id: toastId });
      setNueva({ nombre: "", orden: 10, imprimirCocina: true });
      setCreando(false);
      cargar();
    } else {
      toast.error("Error al crear", { id: toastId });
    }
  };

  const iniciarEdicion = (cat: any) => {
    setEditando(cat.id);
    setFormEdit({
      nombre: cat.nombre,
      orden: cat.orden,
      imprimirCocina: cat.imprimirCocina
    });
  };

  const guardarEdicion = async (id: number) => {
    if (formEdit.orden === "" || !formEdit.nombre.trim()) return toast.error("Datos inválidos");

    const toastId = toast.loading("Guardando...");
    await fetch(`/api/admin/categorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEdit),
    });
    
    toast.success("Actualizado", { id: toastId });
    setEditando(null);
    cargar();
  };

  const borrar = async (id: number) => {
    if (!confirm("¿Borrar esta categoría y sus productos?")) return;
    
    const toastId = toast.loading("Eliminando...");
    await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" });
    toast.success("Eliminada", { id: toastId });
    cargar();
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <Tags className="text-red-600" size={32} />
            Categorías
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Organizá tu menú (Ej: Entradas, Principales, Postres)
          </p>
        </div>

        <button
          onClick={() => setCreando(!creando)}
          className={`px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 ${
            creando 
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
              : "bg-gray-900 text-white hover:bg-black"
          }`}
        >
          {creando ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Nueva Categoría</>}
        </button>
      </div>

      {/* FORMULARIO DE CREACIÓN */}
      {creando && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-100 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
          <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
            Crear Sección del Menú
          </h3>

          <form onSubmit={crearCategoria} className="flex flex-col md:flex-row gap-4 items-end">
            
            {/* Nombre */}
            <div className="flex-1 w-full space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
              <div className="relative">
                <Type className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  autoFocus
                  required
                  value={nueva.nombre}
                  onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  placeholder="Ej: Hamburguesas"
                />
              </div>
            </div>

            {/* Orden */}
            <div className="w-full md:w-32 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Orden</label>
              <div className="relative">
                <ArrowUp01 className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="number"
                  value={nueva.orden}
                  // CORRECCIÓN TYPE SCRIPT
                  onChange={(e) => setNueva({
                    ...nueva,
                    orden: e.target.value === "" ? "" : Number(e.target.value)
                  })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                />
              </div>
            </div>

            {/* Checkbox Cocina (Estilo Botón) */}
            <button
              type="button"
              onClick={() => setNueva({ ...nueva, imprimirCocina: !nueva.imprimirCocina })}
              className={`h-[50px] px-4 rounded-xl border flex items-center gap-2 transition-all ${
                nueva.imprimirCocina 
                  ? "bg-red-50 border-red-200 text-red-700" 
                  : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
              }`}
            >
              <ChefHat size={20} className={nueva.imprimirCocina ? "animate-pulse" : ""} />
              <span className="text-xs font-bold uppercase">
                {nueva.imprimirCocina ? "Envía a Cocina" : "No Cocina"}
              </span>
            </button>

            <button className="h-[50px] bg-red-600 text-white px-8 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center">
              Guardar
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE CATEGORÍAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cabecera Tabla */}
        <div className="grid grid-cols-12 bg-gray-50 p-4 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-2 text-center">Orden</div>
          <div className="col-span-6 md:col-span-7">Nombre Categoría</div>
          <div className="col-span-4 md:col-span-3 text-right">Acciones</div>
        </div>

        {/* Filas */}
        {cargando ? (
           <div className="p-8 text-center text-gray-400 font-medium">Cargando...</div>
        ) : categorias.length === 0 ? (
           <div className="p-8 text-center text-gray-400 font-medium italic">No hay categorías todavía.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {categorias.map((cat) => (
              <div key={cat.id} className={`grid grid-cols-12 p-4 items-center hover:bg-gray-50 transition-colors group ${editando === cat.id ? 'bg-red-50/30' : ''}`}>
                
                {editando === cat.id ? (
                  /* --- MODO EDICIÓN --- */
                  <>
                    <div className="col-span-2 px-2">
                      <input
                        type="number"
                        value={formEdit.orden}
                        onChange={(e) => setFormEdit({
                          ...formEdit,
                          orden: e.target.value === "" ? "" : Number(e.target.value)
                        })}
                        className="w-full text-center bg-white border border-gray-300 rounded-lg py-1.5 font-bold text-gray-700 focus:border-red-500 outline-none"
                      />
                    </div>
                    
                    <div className="col-span-6 md:col-span-7 px-2 flex flex-col md:flex-row gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={formEdit.nombre}
                        onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 font-bold text-gray-700 focus:border-red-500 outline-none"
                      />
                      {/* Toggle Cocina Inline */}
                      <button
                        onClick={() => setFormEdit({...formEdit, imprimirCocina: !formEdit.imprimirCocina})}
                        className={`px-2 py-1 rounded-md border text-xs font-bold flex items-center justify-center gap-1 ${
                          formEdit.imprimirCocina ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        <ChefHat size={14} />
                        {formEdit.imprimirCocina ? "SI" : "NO"}
                      </button>
                    </div>

                    <div className="col-span-4 md:col-span-3 flex justify-end gap-2 pr-2">
                      <button onClick={() => guardarEdicion(cat.id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                        <Save size={18} />
                      </button>
                      <button onClick={() => setEditando(null)} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  /* --- MODO LECTURA --- */
                  <>
                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-black text-sm">
                        {cat.orden}
                      </span>
                    </div>
                    
                    <div className="col-span-6 md:col-span-7 flex items-center gap-3">
                      <span className="font-bold text-gray-800 text-base">{cat.nombre}</span>
                      
                      {/* Badge Cocina */}
                      {cat.imprimirCocina && (
                        <span className="hidden sm:inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <ChefHat size={12} /> Cocina
                        </span>
                      )}
                    </div>

                    <div className="col-span-4 md:col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => iniciarEdicion(cat)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => borrar(cat.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}