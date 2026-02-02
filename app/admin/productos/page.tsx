"use client";
import { useState, useEffect } from "react";

export default function ProductosPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editando, setEditando] = useState<number | null>(null);
  
  // Estado temporal para los cambios antes de guardar
  const [form, setForm] = useState({ precio: 0, nombre: "" });

  const cargarProductos = async () => {
    try {
      const res = await fetch("/api/admin/productos");
      if (res.ok) {
        const data = await res.json();
        setCategorias(data);
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // Activar modo edición
  const iniciarEdicion = (prod: any) => {
    setEditando(prod.id);
    setForm({ precio: prod.precio, nombre: prod.nombre });
  };

  // Guardar cambios en la base de datos
  const guardarCambios = async (id: number) => {
    await fetch(`/api/admin/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditando(null);
    cargarProductos(); // Refrescar lista
  };

  // Prender/Apagar producto (Stock)
  const toggleActivo = async (prod: any) => {
    await fetch(`/api/admin/productos/${prod.id}`, {
      method: "PATCH",
      body: JSON.stringify({ activo: !prod.activo }),
    });
    cargarProductos();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20">
      <h1 className="text-3xl font-black text-gray-800 mb-6">GESTIÓN DE CARTA 🍔</h1>

      {categorias.map((cat) => (
        <div key={cat.id} className="mb-8">
          <h2 className="text-xl font-bold text-gray-600 mb-4 border-b-2 border-gray-200 pb-2">
            {cat.nombre}
          </h2>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            {cat.productos.map((prod: any) => (
              <div key={prod.id} className={`p-4 border-b flex justify-between items-center ${!prod.activo ? 'bg-gray-100 opacity-60' : ''}`}>
                
                {/* SI ESTAMOS EDITANDO ESTE PRODUCTO */}
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
                    <button onClick={() => guardarCambios(prod.id)} className="bg-green-600 text-white p-2 rounded shadow hover:bg-green-700">
                      💾
                    </button>
                    <button onClick={() => setEditando(null)} className="text-gray-500 p-2 hover:text-gray-700">
                      ✖
                    </button>
                  </div>
                ) : (
                  /* VISTA NORMAL */
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
                      
                      <button 
                        onClick={() => iniciarEdicion(prod)} 
                        className="bg-blue-100 text-blue-700 px-3 py-2 rounded font-bold hover:bg-blue-200"
                      >
                        ✏️
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