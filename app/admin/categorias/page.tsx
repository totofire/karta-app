"use client";
import { useState, useEffect } from "react";

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  
  // Agregamos imprimirCocina al estado (por defecto true)
  const [nueva, setNueva] = useState({ nombre: "", orden: 10, imprimirCocina: true });
  
  const [editando, setEditando] = useState<number | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", orden: 0, imprimirCocina: true });

  const cargar = async () => {
    const res = await fetch("/api/admin/categorias");
    const data = await res.json();
    setCategorias(data);
  };

  useEffect(() => { cargar(); }, []);

  const crearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/admin/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nueva),
    });
    // Reseteamos el formulario
    setNueva({ nombre: "", orden: 10, imprimirCocina: true });
    cargar();
  };

  const guardarEdicion = async (id: number) => {
    await fetch(`/api/admin/categorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEdit),
    });
    setEditando(null);
    cargar();
  };

  const borrar = async (id: number) => {
      if (!confirm("¿Borrar?")) return;
      await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" });
      cargar();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 pb-20">
      <h1 className="text-3xl font-black text-slate-800 mb-6">CATEGORÍAS DEL MENÚ 📑</h1>

      {/* FORMULARIO DE CREACIÓN */}
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h3 className="font-bold text-slate-500 mb-4 text-sm uppercase">Nueva Categoría</h3>
        <form onSubmit={crearCategoria} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-400 mb-1">Nombre</label>
            <input required value={nueva.nombre} onChange={e => setNueva({...nueva, nombre: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-red-500" placeholder="Ej: Postres" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-bold text-slate-400 mb-1">Orden</label>
            <input type="number" value={nueva.orden} onChange={e => setNueva({...nueva, orden: Number(e.target.value)})} className="w-full border p-2 rounded outline-none focus:border-red-500" />
          </div>
          
          {/* CHECKBOX NUEVO */}
          <div className="flex items-center gap-2 pb-2 px-2 bg-slate-50 rounded border border-slate-200 h-[42px] cursor-pointer" onClick={() => setNueva({...nueva, imprimirCocina: !nueva.imprimirCocina})}>
            <input 
              type="checkbox" 
              checked={nueva.imprimirCocina} 
              readOnly
              className="w-5 h-5 accent-red-600 cursor-pointer"
            />
            <span className="text-sm font-bold text-slate-600 select-none">
              👨‍🍳 ¿Va a Cocina?
            </span>
          </div>

          <button className="bg-slate-800 text-white px-6 py-2 rounded font-bold hover:bg-slate-700 h-[42px]">
            Crear
          </button>
        </form>
      </div>

      {/* LISTA */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="p-4 w-20 text-center">Orden</th>
              <th className="p-4">Nombre</th>
              <th className="p-4 text-center">Cocina</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categorias.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50">
                {editando === cat.id ? (
                  /* MODO EDICIÓN */
                  <>
                    <td className="p-2"><input type="number" value={formEdit.orden} onChange={e => setFormEdit({...formEdit, orden: Number(e.target.value)})} className="w-full border p-2 rounded text-center" /></td>
                    <td className="p-2"><input type="text" value={formEdit.nombre} onChange={e => setFormEdit({...formEdit, nombre: e.target.value})} className="w-full border p-2 rounded" /></td>
                    <td className="p-2 text-center">
                      <input 
                        type="checkbox" 
                        checked={formEdit.imprimirCocina} 
                        onChange={e => setFormEdit({...formEdit, imprimirCocina: e.target.checked})}
                        className="w-6 h-6 accent-red-600"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => guardarEdicion(cat.id)} className="text-green-600 font-bold mr-2 text-xl">💾</button>
                      <button onClick={() => setEditando(null)} className="text-slate-400 font-bold text-xl">✖</button>
                    </td>
                  </>
                ) : (
                  /* MODO LECTURA */
                  <>
                    <td className="p-4 text-center font-mono text-slate-400 font-bold">{cat.orden}</td>
                    <td className="p-4 font-bold text-slate-700">{cat.nombre}</td>
                    
                    {/* INDICADOR VISUAL */}
                    <td className="p-4 text-center">
                      {cat.imprimirCocina ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold border border-green-200">SÍ</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-400 px-2 py-1 rounded-full text-xs font-bold border border-slate-200">NO</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setEditando(cat.id); setFormEdit(cat); }}
                        className="text-blue-600 font-bold mr-4 hover:underline"
                      >
                        Editar
                      </button>
                      <button onClick={() => borrar(cat.id)} className="text-red-400 font-bold hover:text-red-600">Borrar</button>
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