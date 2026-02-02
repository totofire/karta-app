"use client";
import { useState, useEffect } from "react";

export default function ProductosPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  const [creando, setCreando] = useState(false); // Nuevo estado para mostrar formulario de crear
  
  // Estado para editar
  const [form, setForm] = useState({ precio: 0, nombre: "" });

  // Estado para crear nuevo
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    precio: 0,
    categoriaId: 1, // Default a la primera categoría (Cervezas)
    descripcion: ""
  });

  const cargarProductos = async () => {
    const res = await fetch("/api/admin/productos");
    if (res.ok) {
      const data = await res.json();
      setCategorias(data);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // --- FUNCIONES DE EDICIÓN ---
  const iniciarEdicion = (prod: any) => {
    setEditando(prod.id);
    setForm({ precio: prod.precio, nombre: prod.nombre });
  };

  const guardarCambios = async (id: number) => {
    await fetch(`/api/admin/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditando(null);
    cargarProductos();
  };

  const toggleActivo = async (prod: any) => {
    await fetch(`/api/admin/productos/${prod.id}`, {
      method: "PATCH",
      body: JSON.stringify({ activo: !prod.activo }),
    });
    cargarProductos();
  };

  // --- FUNCIONES DE CREACIÓN ---
  const guardarNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoProducto),
    });
    setCreando(false);
    setNuevoProducto({ nombre: "", precio: 0, categoriaId: 1, descripcion: "" });
    cargarProductos();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-gray-800">GESTIÓN DE CARTA 🍔</h1>
        <button 
          onClick={() => setCreando(!creando)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-slate-700 transition-colors"
        >
          {creando ? "❌ Cancelar" : "➕ Nuevo Producto"}
        </button>
      </div>

      {/* FORMULARIO DE CREACIÓN (Se muestra solo si creando es true) */}
      {creando && (
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Agregar Nuevo Plato</h3>
          <form onSubmit={guardarNuevo} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-gray-500 mb-1">Nombre</label>
              <input 
                required 
                className="w-full border p-2 rounded" 
                value={nuevoProducto.nombre}
                onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-bold text-gray-500 mb-1">Precio</label>
              <input 
                required type="number" 
                className="w-full border p-2 rounded" 
                value={nuevoProducto.precio}
                onChange={e => setNuevoProducto({...nuevoProducto, precio: Number(e.target.value)})}
              />
            </div>
            <div className="w-48">
              <label className="block text-xs font-bold text-gray-500 mb-1">Categoría</label>
              <select 
                className="w-full border p-2 rounded"
                value={nuevoProducto.categoriaId}
                onChange={e => setNuevoProducto({...nuevoProducto, categoriaId: Number(e.target.value)})}
              >
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">
              Guardar
            </button>
          </form>
        </div>
      )}

      {/* LISTADO DE PRODUCTOS (Igual que antes) */}
      {categorias.map((cat) => (
        <div key={cat.id} className="mb-8">
          <h2 className="text-xl font-bold text-gray-600 mb-4 border-b-2 border-gray-200 pb-2">
            {cat.nombre}
          </h2>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            {cat.productos.map((prod: any) => (
              <div key={prod.id} className={`p-4 border-b flex justify-between items-center ${!prod.activo ? 'bg-gray-100 opacity-60' : ''}`}>
                
                {editando === prod.id ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={form.nombre}
                      onChange={(e) => setForm({...form, nombre: e.target.value})}
                      className="border p-2 rounded w-full font-bold text-gray-900"
                    />
                    <input 
                      type="number" 
                      value={form.precio}
                      onChange={(e) => setForm({...form, precio: Number(e.target.value)})}
                      className="border p-2 rounded w-32 font-mono text-gray-900"
                    />
                    <button onClick={() => guardarCambios(prod.id)} className="bg-green-600 text-white p-2 rounded shadow">💾</button>
                    <button onClick={() => setEditando(null)} className="text-gray-500 p-2">✖</button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 text-lg">{prod.nombre}</div>
                      <div className="text-green-600 font-mono font-bold">${prod.precio}</div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleActivo(prod)}
                        className={`px-3 py-1 rounded text-xs font-bold ${prod.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {prod.activo ? 'EN STOCK' : 'AGOTADO'}
                      </button>
                      <button onClick={() => iniciarEdicion(prod)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded font-bold hover:bg-blue-200">✏️</button>
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