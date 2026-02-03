"use client";
import { useState, useEffect } from "react";

export default function MesasPage() {
  const [mesas, setMesas] = useState<any[]>([]);
  
  // --- ESTADOS PARA SECTORES ---
  const [sectores, setSectores] = useState<any[]>([]);
  const [nuevoSector, setNuevoSector] = useState("");
  const [agregandoSector, setAgregandoSector] = useState(false);

  // --- NUEVO: ESTADO DE FILTRO ---
  const [filtroSector, setFiltroSector] = useState("Todos");

  // Estados de Mesas
  const [modo, setModo] = useState<'manual' | 'rapida'>('manual');
  const [manual, setManual] = useState({ nombre: "", qr_token: "", sector: "" });
  const [rapida, setRapida] = useState({ cantidad: 10, inicio: 1, sector: "" });
  const [editando, setEditando] = useState<number | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", qr_token: "", sector: "" });

  const cargar = async () => {
    // 1. Cargar Mesas
    const resMesas = await fetch("/api/admin/mesas");
    const dataMesas = await resMesas.json();
    setMesas(dataMesas);
    
    // Sugerir número
    const ultimoNumero = dataMesas.reduce((max: number, m: any) => {
      const match = m.nombre.match(/(\d+)/);
      return match ? Math.max(max, parseInt(match[0])) : max;
    }, 0);
    setRapida(prev => ({ ...prev, inicio: ultimoNumero + 1 }));

    // 2. Cargar Sectores Oficiales
    cargarSectores();
  };

  const cargarSectores = async () => {
    const res = await fetch("/api/admin/sectores");
    if (res.ok) setSectores(await res.json());
  };

  useEffect(() => { cargar(); }, []);

  // --- FUNCIÓN CREAR SECTOR (Rápida e Inline) ---
  const crearSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoSector.trim()) return;

    const res = await fetch("/api/admin/sectores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoSector }),
    });

    if (res.ok) {
      setNuevoSector("");
      setAgregandoSector(false);
      cargarSectores(); // Refrescamos la lista al toque
    } else {
      const data = await res.json();
      alert(data.error); // "⚠️ Ese sector ya existe."
    }
  };

  // --- LÓGICA DE MESAS CON FILTRO ---
  const mesasPorSector = mesas.reduce((acc: any, mesa) => {
    const sector = mesa.sector || "Sin Sector";
    
    // Si hay filtro activo y no coincide, ignoramos esta mesa
    if (filtroSector !== "Todos" && sector !== filtroSector) return acc;
    
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(mesa);
    return acc;
  }, {});

  const handleNombreChange = (val: string) => {
    const token = val.toLowerCase().trim().replace(/[\s\W-]+/g, '-').replace(/^-+|-+$/g, '');
    setManual({ ...manual, nombre: val, qr_token: token });
  };

  const crearManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/mesas", { method: "POST", body: JSON.stringify({ ...manual, tipo: 'manual' }) });
    if (res.ok) { setManual({...manual, nombre: "", qr_token: ""}); cargar(); }
    else { const d = await res.json(); alert(d.error); }
  };

  const crearRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/mesas", { method: "POST", body: JSON.stringify({ ...rapida, tipo: 'rapida' }) });
    if (res.ok) { cargar(); alert("Mesas creadas!"); }
  };
  
  const guardarEdicion = async (id: number) => {
      await fetch(`/api/admin/mesas/${id}`, { method: "PATCH", body: JSON.stringify(formEdit) });
      setEditando(null); cargar();
  }

  const borrar = async (id: number) => {
      if(confirm("¿Borrar?")) { await fetch(`/api/admin/mesas/${id}`, { method: "DELETE" }); cargar(); }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-slate-800">CONFIGURACIÓN DE MESAS 🍽️</h1>
        
        {/* --- SELECTOR DE FILTRO --- */}
        <select 
          className="bg-white border border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={filtroSector}
          onChange={(e) => setFiltroSector(e.target.value)}
        >
          <option value="Todos">Ver Todos</option>
          {sectores.map(s => (
            <option key={s.id} value={s.nombre}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {/* --- BARRA DE SECTORES --- */}
      <div className="flex flex-wrap items-center gap-3 mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Sectores:</span>
        
        {/* Lista de Chips */}
        {sectores.map((s) => (
          <span key={s.id} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold border border-slate-200">
            {s.nombre}
          </span>
        ))}

        {/* Botón / Formulario Inline */}
        {agregandoSector ? (
          <form onSubmit={crearSector} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
            <input 
              autoFocus
              className="border-2 border-blue-500 rounded-lg px-2 py-1 text-sm font-bold outline-none w-32"
              placeholder="Nombre..."
              value={nuevoSector}
              onChange={e => setNuevoSector(e.target.value)}
              onBlur={() => !nuevoSector && setAgregandoSector(false)}
            />
            <button className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold hover:bg-blue-700 shadow">
              ✓
            </button>
            <button type="button" onClick={() => setAgregandoSector(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
          </form>
        ) : (
          <button 
            onClick={() => setAgregandoSector(true)}
            className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm font-bold hover:bg-slate-700 transition-transform active:scale-95 flex items-center gap-1 shadow-sm"
          >
            <span>+</span> Crear Sector
          </button>
        )}
      </div>

      {/* FORMULARIO DE MESAS */}
      <div className="bg-white rounded-xl shadow mb-8 overflow-hidden">
        <div className="flex border-b border-slate-200">
           <button onClick={() => setModo('manual')} className={`flex-1 p-4 font-bold ${modo==='manual'?'bg-slate-800 text-white':''}`}>Manual</button>
           <button onClick={() => setModo('rapida')} className={`flex-1 p-4 font-bold ${modo==='rapida'?'bg-slate-800 text-white':''}`}>Rápida</button>
        </div>
        
        <div className="p-6">
          {modo === 'manual' ? (
            <form onSubmit={crearManual} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-slate-400 mb-1">Sector / Zona</label>
                <select 
                  className="w-full border p-2 rounded font-bold text-slate-700"
                  value={manual.sector}
                  onChange={e => setManual({...manual, sector: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  {sectores.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre</label>
                <input required className="w-full border p-2 rounded" value={manual.nombre} onChange={e => handleNombreChange(e.target.value)} />
              </div>
              <div className="flex-1 w-full">
                 <label className="block text-xs font-bold text-slate-400 mb-1">Token</label>
                 <input required className="w-full border p-2 rounded bg-slate-50" value={manual.qr_token} onChange={e => setManual({...manual, qr_token: e.target.value})} />
              </div>
              <button className="bg-green-600 text-white px-6 py-2 rounded font-bold">Crear</button>
            </form>
          ) : (
            <form onSubmit={crearRapida} className="flex flex-col md:flex-row gap-4 items-end">
               <div className="w-full md:w-48">
                <label className="block text-xs font-bold text-slate-400 mb-1">Sector para todas</label>
                <select 
                  className="w-full border p-2 rounded font-bold text-slate-700"
                  value={rapida.sector}
                  onChange={e => setRapida({...rapida, sector: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  {sectores.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-400 mb-1">Cantidad</label>
                 <input type="number" className="w-full border p-2 rounded" value={rapida.cantidad} onChange={e => setRapida({...rapida, cantidad: Number(e.target.value)})} />
              </div>
              <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-400 mb-1">Desde N°</label>
                 <input type="number" className="w-full border p-2 rounded" value={rapida.inicio} onChange={e => setRapida({...rapida, inicio: Number(e.target.value)})} />
              </div>
              <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold">Generar</button>
            </form>
          )}
        </div>
      </div>

      {/* LISTADO AGRUPADO */}
      {Object.keys(mesasPorSector).sort().map(sector => (
        <div key={sector} className="mb-8 animate-in fade-in">
          <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">
            {sector} <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600 ml-2">{mesasPorSector[sector].length} mesas</span>
          </h2>
          <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                 <tr>
                   <th className="p-4">Nombre</th>
                   <th className="p-4">QR</th>
                   <th className="p-4 text-right">Acciones</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mesasPorSector[sector].map((mesa: any) => (
                  <tr key={mesa.id} className="hover:bg-slate-50">
                    {editando === mesa.id ? (
                      <>
                        <td className="p-2 flex gap-2">
                          <select className="w-32 border p-1 rounded text-sm" value={formEdit.sector} onChange={e => setFormEdit({...formEdit, sector: e.target.value})}>
                             {sectores.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                          </select>
                          <input className="flex-1 border p-1 rounded font-bold" value={formEdit.nombre} onChange={e => setFormEdit({...formEdit, nombre: e.target.value})} />
                        </td>
                        <td className="p-2">
                           <input className="w-full border p-1 rounded text-xs font-mono" value={formEdit.qr_token} onChange={e => setFormEdit({...formEdit, qr_token: e.target.value})} />
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => guardarEdicion(mesa.id)} className="text-green-600 font-bold mr-2">💾</button>
                          <button onClick={() => setEditando(null)} className="text-slate-400">✖</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 font-bold text-slate-700">{mesa.nombre}</td>
                        <td className="p-4 text-sm text-slate-500 font-mono">{mesa.qr_token}</td>
                        <td className="p-4 text-right">
                           <button onClick={() => { setEditando(mesa.id); setFormEdit(mesa); }} className="text-blue-600 font-bold mr-4 text-sm">Editar</button>
                           <button onClick={() => borrar(mesa.id)} className="text-red-400 font-bold text-sm hover:text-red-600">Borrar</button>
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