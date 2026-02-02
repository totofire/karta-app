"use client";
import { useState, useEffect } from "react";

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [nueva, setNueva] = useState({ nombre: "", orden: 10 });
  const [editando, setEditando] = useState<number | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", orden: 0 });

  const cargar = async () => {
    const res = await fetch("/api/admin/categorias");
    const data = await res.json();
    setCategorias(data);
  };

  useEffect(() => { cargar(); }, []);

  // Crear Categoría
  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });
    setNueva({ nombre: "", orden: 10 });
    cargar();
  };

  // Guardar Edición
  const guardarEdicion = async (id: number) => {
    await fetch(`/api/admin/categorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEdit),
    });
    setEditando(null);
    cargar();
  };

  // Borrar Categoría
  const borrar = async (id: number) => {
    if (!confirm("¿Seguro querés borrar esta categoría?")) return;
    
    const res = await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" });
    if (res.ok) {
      cargar();
    } else {
      alert("❌ No se puede borrar: Primero eliminá o mové los productos que tiene adentro.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 pb-20">
      <h1 className="text-3xl font-black text-slate-800 mb-6">CATEGORÍAS DEL MENÚ 📑</h1>

      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h3 className="font-bold text-slate-500 mb-4 text-sm uppercase">Nueva Categoría</h3>
        <form onSubmit={crearCategoria} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-400 mb-1">Nombre</label>
            <input 
              required
              value={nueva.nombre}
              onChange={e => setNueva({...nueva, nombre: e.target.value})}
              className="w-full border p-2 rounded outline-none focus:border-blue-500"
              placeholder="Ej: Postres"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-bold text-slate-400 mb-1">Orden</label>
            <input 
              type="number"
              value={nueva.orden}
              onChange={e => setNueva({...nueva, orden: Number(e.target.value)})}
              className="w-full border p-2 rounded outline-none focus:border-blue-500"
            />
          </div>
          <button className="bg-slate-800 text-white px-6 py-2 rounded font-bold hover:bg-slate-700">
            Crear
          </button>
        </form>
      </div>

      {/* LISTA DE CATEGORÍAS */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="p-4 w-20 text-center">Orden</th>
              <th className="p-4">Nombre</th>
              <th className="p-4 text-center">Productos</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categorias.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50">
                {editando === cat.id ? (
                  /* MODO EDICIÓN */
                  <>
                    <td className="p-2">
                      <input 
                        type="number" 
                        value={formEdit.orden}
                        onChange={e => setFormEdit({...formEdit, orden: Number(e.target.value)})}
                        className="w-full border p-2 rounded text-center"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={formEdit.nombre}
                        onChange={e => setFormEdit({...formEdit, nombre: e.target.value})}
                        className="w-full border p-2 rounded"
                      />
                    </td>
                    <td className="p-4 text-center text-slate-400">-</td>
                    <td className="p-4 text-right">
                      <button onClick={() => guardarEdicion(cat.id)} className="bg-green-100 text-green-700 px-3 py-1 rounded font-bold mr-2">💾</button>
                      <button onClick={() => setEditando(null)} className="text-slate-400 font-bold">✖</button>
                    </td>
                  </>
                ) : (
                  /* MODO LECTURA */
                  <>
                    <td className="p-4 text-center font-mono text-slate-400 font-bold">
                      {cat.orden}
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {cat.nombre}
                    </td>
                    <td className="p-4 text-center text-sm">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold">
                        {cat._count?.productos || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setEditando(cat.id); setFormEdit({ nombre: cat.nombre, orden: cat.orden }); }}
                        className="text-blue-600 font-bold mr-4 hover:underline"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => borrar(cat.id)}
                        className="text-red-400 font-bold hover:text-red-600"
                      >
                        Borrar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}