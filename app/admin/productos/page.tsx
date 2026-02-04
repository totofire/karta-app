"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { 
  Plus, 
  Search, 
  UtensilsCrossed, 
  DollarSign, 
  Tag, 
  FileText, 
  Edit2, 
  Save, 
  X, 
  Check, 
  Power
} from "lucide-react";

// Definimos el tipo para evitar el error de "string no es number"
type ProductForm = {
  nombre: string;
  precio: number | ""; // <--- AQUÍ ESTÁ LA MAGIA (Permite borrar el cero)
  categoriaId: number;
  descripcion: string;
};

export default function ProductosPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Estado para editar (Tipado correctamente)
  const [form, setForm] = useState<ProductForm>({ 
    precio: 0, 
    nombre: "", 
    categoriaId: 0, 
    descripcion: "" 
  });

  // Estado para crear nuevo (Tipado correctamente)
  const [nuevoProducto, setNuevoProducto] = useState<ProductForm>({
    nombre: "",
    precio: "", // Empezamos vacío para que el placeholder se vea
    categoriaId: 1,
    descripcion: "",
  });

  const cargarProductos = async () => {
    try {
      const res = await fetch("/api/admin/productos");
      if (res.ok) {
        const data = await res.json();
        setCategorias(data);
        // Si no hay categoría seleccionada en el nuevo producto, ponemos la primera
        if (data.length > 0 && nuevoProducto.categoriaId === 1) {
             setNuevoProducto(prev => ({...prev, categoriaId: data[0].id}));
        }
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // --- FUNCIONES DE EDICIÓN ---
  const iniciarEdicion = (prod: any) => {
    setEditando(prod.id);
    setForm({ 
        precio: prod.precio, 
        nombre: prod.nombre, 
        descripcion: prod.descripcion || "", 
        categoriaId: prod.categoriaId 
    });
  };

  const guardarCambios = async (id: number) => {
    if (form.precio === "" || form.nombre.trim() === "") return toast.error("Datos incompletos");
    
    const toastId = toast.loading("Guardando...");
    await fetch(`/api/admin/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast.success("Producto actualizado", { id: toastId });
    setEditando(null);
    cargarProductos();
  };

  const toggleActivo = async (prod: any) => {
    // Optimistic UI update (para que se sienta instantáneo)
    const nuevoEstado = !prod.activo;
    toast.promise(
        fetch(`/api/admin/productos/${prod.id}`, {
            method: "PATCH",
            body: JSON.stringify({ activo: nuevoEstado }),
        }).then(() => cargarProductos()),
        {
            loading: 'Actualizando estado...',
            success: nuevoEstado ? '¡Producto activado! 🟢' : 'Producto pausado 🔴',
            error: 'Error al actualizar'
        }
    );
  };

  // --- FUNCIONES DE CREACIÓN ---
  const guardarNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.nombre || nuevoProducto.precio === "") return toast.error("Faltan datos obligatorios");

    const toastId = toast.loading("Creando plato...");
    await fetch("/api/admin/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoProducto),
    });
    
    toast.success("¡Plato creado con éxito!", { id: toastId });
    setCreando(false);
    setNuevoProducto({
      nombre: "",
      precio: "",
      categoriaId: categorias[0]?.id || 1,
      descripcion: "",
    });
    cargarProductos();
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <UtensilsCrossed className="text-red-600" size={32} />
            Gestión de Carta
          </h1>
          <p className="text-gray-500 font-medium mt-1">Administrá tus platos, precios y disponibilidad</p>
        </div>
        
        <button
          onClick={() => setCreando(!creando)}
          className={`px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 ${
              creando 
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
              : "bg-gray-900 text-white hover:bg-black"
          }`}
        >
          {creando ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Nuevo Plato</>}
        </button>
      </div>

      {/* FORMULARIO DE CREACIÓN (Animado) */}
      {creando && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-red-100 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
          <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
            Agregar Nuevo Item
          </h3>
          
          <form onSubmit={guardarNuevo} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Nombre */}
            <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Nombre del Plato</label>
                <div className="relative">
                    <UtensilsCrossed className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                        autoFocus
                        required
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                        placeholder="Ej: Hamburguesa Karta"
                        value={nuevoProducto.nombre}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                    />
                </div>
            </div>

            {/* Precio */}
            <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Precio</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                        required
                        type="number"
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                        placeholder="0.00"
                        value={nuevoProducto.precio}
                        // SOLUCIÓN DEL ERROR DE TYPE SCRIPT
                        onChange={(e) => setNuevoProducto({
                            ...nuevoProducto,
                            precio: e.target.value === "" ? "" : Number(e.target.value),
                        })}
                    />
                </div>
            </div>

            {/* Categoría */}
            <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Categoría</label>
                <div className="relative">
                    <Tag className="absolute left-3 top-3 text-gray-400" size={16} />
                    <select
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500 transition-all appearance-none"
                        value={nuevoProducto.categoriaId}
                        onChange={(e) => setNuevoProducto({
                            ...nuevoProducto,
                            categoriaId: Number(e.target.value),
                        })}
                    >
                        {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-12 space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Descripción (Opcional)</label>
                <div className="relative">
                    <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                        placeholder="Ingredientes, detalles..."
                        value={nuevoProducto.descripcion}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })}
                    />
                </div>
            </div>

            <div className="md:col-span-12 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setCreando(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95">
                    Guardar Producto
                </button>
            </div>

          </form>
        </div>
      )}

      {/* LISTADO POR CATEGORÍAS */}
      {cargando ? (
          <div className="text-center py-20 text-gray-400 animate-pulse">Cargando carta...</div>
      ) : categorias.map((cat) => (
        <div key={cat.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-1 bg-red-600 rounded-full"></div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
              {cat.nombre}
            </h2>
            <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                {cat.productos.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cat.productos.map((prod: any) => (
              <div 
                key={prod.id} 
                className={`
                    bg-white p-5 rounded-2xl shadow-sm border transition-all duration-200 relative group
                    ${editando === prod.id ? 'border-red-500 ring-4 ring-red-50 z-10' : 'border-gray-100 hover:shadow-md hover:border-red-100'}
                    ${!prod.activo && editando !== prod.id ? 'opacity-60 grayscale' : ''}
                `}
              >
                {editando === prod.id ? (
                  /* MODO EDICIÓN CARD */
                  <div className="space-y-3">
                    <input 
                      autoFocus
                      className="w-full font-bold text-lg border-b border-gray-200 focus:border-red-500 outline-none pb-1"
                      value={form.nombre}
                      onChange={(e) => setForm({...form, nombre: e.target.value})}
                    />
                    <input 
                      className="w-full text-sm text-gray-500 border-b border-gray-200 focus:border-red-500 outline-none pb-1"
                      placeholder="Descripción..."
                      value={form.descripcion}
                      onChange={(e) => setForm({...form, descripcion: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <DollarSign className="absolute left-2 top-2 text-gray-400" size={14} />
                            <input 
                                type="number" 
                                className="w-full pl-6 py-1.5 bg-gray-50 rounded-lg font-bold text-gray-800 outline-none"
                                value={form.precio}
                                onChange={(e) => setForm({...form, precio: e.target.value === "" ? "" : Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setEditando(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
                        <button onClick={() => guardarCambios(prod.id)} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"><Save size={18}/></button>
                    </div>
                  </div>
                ) : (
                  /* MODO LECTURA CARD */
                  <>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800 text-lg leading-tight pr-2">{prod.nombre}</h3>
                        <span className="font-black text-lg text-red-600">${prod.precio}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[2.5em]">
                        {prod.descripcion || <span className="italic opacity-50">Sin descripción</span>}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <button 
                            onClick={() => toggleActivo(prod)}
                            className={`
                                text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors
                                ${prod.activo 
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                                    : 'bg-red-50 text-red-700 hover:bg-red-100'}
                            `}
                        >
                            <Power size={14} />
                            {prod.activo ? 'EN STOCK' : 'AGOTADO'}
                        </button>

                        <button 
                            onClick={() => iniciarEdicion(prod)} 
                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                            title="Editar plato"
                        >
                            <Edit2 size={18} />
                        </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}