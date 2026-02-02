"use client";
import { useState, useEffect } from "react";

export default function MesasPage() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [modo, setModo] = useState<'manual' | 'rapida'>('manual');
  
  // Estado Manual
  const [manual, setManual] = useState({ nombre: "", qr_token: "" });
  
  // Estado Rápido
  const [rapida, setRapida] = useState({ cantidad: 10, inicio: 1 });

  const [editando, setEditando] = useState<number | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", qr_token: "" });

  const cargar = async () => {
    const res = await fetch("/api/admin/mesas");
    const data = await res.json();
    setMesas(data);
    
    // Calcular sugerencia para creación rápida
    const ultimoNumero = data.reduce((max: number, m: any) => {
      const match = m.nombre.match(/(\d+)/);
      return match ? Math.max(max, parseInt(match[0])) : max;
    }, 0);
    setRapida(prev => ({ ...prev, inicio: ultimoNumero + 1 }));
  };

  useEffect(() => { cargar(); }, []);

  // --- MODO MANUAL ---
  const handleNombreChange = (val: string) => {
    setManual({ ...manual, nombre: val });
    const tokenGenerado = val.toLowerCase().trim().replace(/[\s\W-]+/g, '-').replace(/^-+|-+$/g, '');
    setManual(prev => ({ ...prev, nombre: val, qr_token: tokenGenerado }));
  };

  const crearManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/mesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...manual, tipo: 'manual' }),
    });
    
    const data = await res.json();

    if (res.ok) {
      setManual({ nombre: "", qr_token: "" });
      cargar();
      // Opcional: alert("Mesa creada con éxito");
    } else {
      // AQUÍ MOSTRAMOS EL ERROR DE NOMBRE DUPLICADO
      alert(data.error || "Ocurrió un error al crear la mesa.");
    }
  };

  // --- MODO RÁPIDO ---
  const crearRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/mesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rapida, tipo: 'rapida' }),
    });

    const data = await res.json();
    if (res.ok) {
      cargar();
      let mensaje = `✅ Proceso finalizado.\n\n- Creadas: ${data.creadas}`;
      if (data.fallidas.length > 0) {
        mensaje += `\n- Omitidas (Ya existían): ${data.fallidas.length}\n  (${data.fallidas.join(", ")})`;
      }
      alert(mensaje);
    }
  };

  // --- EDICIÓN Y BORRADO ---
  const guardarEdicion = async (id: number) => {
    await fetch(`/api/admin/mesas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formEdit),
    });
    setEditando(null);
    cargar();
  };

  const borrar = async (id: number) => {
    if (!confirm("¿Seguro querés eliminar esta mesa?")) return;
    const res = await fetch(`/api/admin/mesas/${id}`, { method: "DELETE" });
    if (res.ok) cargar();
    else alert("❌ No se puede borrar: Tiene historial de ventas.");
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 pb-20">
      <h1 className="text-3xl font-black text-slate-800 mb-6">CONFIGURACIÓN DE MESAS 🍽️</h1>

      {/* TARJETA DE CREACIÓN */}
      <div className="bg-white rounded-xl shadow mb-8 border border-slate-200 overflow-hidden">
        {/* PESTAÑAS */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setModo('manual')}
            className={`flex-1 p-4 font-bold text-sm uppercase tracking-wider transition-colors ${modo === 'manual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            ✏️ Manual
          </button>
          <button 
            onClick={() => setModo('rapida')}
            className={`flex-1 p-4 font-bold text-sm uppercase tracking-wider transition-colors ${modo === 'rapida' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            ⚡ Rápida (Masiva)
          </button>
        </div>

        <div className="p-6">
          {modo === 'manual' ? (
            /* FORMULARIO MANUAL */
            <form onSubmit={crearManual} className="flex flex-col md:flex-row gap-4 items-end animate-in fade-in">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre (Ej: Barra VIP)</label>
                <input 
                  required
                  value={manual.nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  className="w-full border p-2 rounded outline-none focus:border-blue-500 font-bold text-slate-700"
                  placeholder="Nombre de la mesa"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1">Token Automático</label>
                <input 
                  required
                  value={manual.qr_token}
                  onChange={(e) => setManual({...manual, qr_token: e.target.value})}
                  className="w-full border p-2 rounded outline-none focus:border-blue-500 font-mono text-sm bg-slate-50"
                />
              </div>
              <button className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 w-full md:w-auto">
                Crear Una
              </button>
            </form>
          ) : (
            /* FORMULARIO RÁPIDO */
            <form onSubmit={crearRapida} className="flex flex-col md:flex-row gap-4 items-end animate-in fade-in">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 mb-1">Cantidad de Mesas</label>
                <input 
                  required type="number" min="1" max="50"
                  value={rapida.cantidad}
                  onChange={(e) => setRapida({...rapida, cantidad: Number(e.target.value)})}
                  className="w-full border p-2 rounded outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 mb-1">Empezar desde el N°</label>
                <input 
                  required type="number" min="1"
                  value={rapida.inicio}
                  onChange={(e) => setRapida({...rapida, inicio: Number(e.target.value)})}
                  className="w-full border p-2 rounded outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 w-full md:w-auto">
                ⚡ Generar
              </button>
            </form>
          )}
        </div>
      </div>

      {/* LISTA DE MESAS */}
      <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">QR Token</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mesas.map((mesa) => (
              <tr key={mesa.id} className="hover:bg-slate-50">
                {editando === mesa.id ? (
                  /* MODO EDICIÓN */
                  <>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={formEdit.nombre}
                        onChange={e => setFormEdit({...formEdit, nombre: e.target.value})}
                        className="w-full border p-2 rounded font-bold"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={formEdit.qr_token}
                        onChange={e => setFormEdit({...formEdit, qr_token: e.target.value})}
                        className="w-full border p-2 rounded font-mono text-sm"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => guardarEdicion(mesa.id)} className="bg-green-100 text-green-700 px-3 py-1 rounded font-bold mr-2">💾</button>
                      <button onClick={() => setEditando(null)} className="text-slate-400 font-bold">✖</button>
                    </td>
                  </>
                ) : (
                  /* MODO LECTURA */
                  <>
                    <td className="p-4 font-bold text-slate-700">{mesa.nombre}</td>
                    <td className="p-4 font-mono text-slate-500 text-sm">{mesa.qr_token}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => { setEditando(mesa.id); setFormEdit({ nombre: mesa.nombre, qr_token: mesa.qr_token }); }} className="text-blue-600 font-bold mr-4 hover:underline">Editar</button>
                      <button onClick={() => borrar(mesa.id)} className="text-red-400 font-bold hover:text-red-600">Borrar</button>
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