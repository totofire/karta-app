"use client";

import { useEffect, useState } from "react";
import {
  Users, Plus, Loader2, AlertCircle, CheckCircle2, X,
  Pencil, Trash2, Eye, EyeOff, UserPlus,
  Mail, Lock, User, Search, ShieldCheck, ShieldOff, Power
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Mozo {
  id:        number;
  nombre:    string;
  email:     string;
  activo:    boolean;
  fechaAlta: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR MOZO
// ════════════════════════════════════════════════════════════════════════════════
function ModalCrearMozo({ onClose, onCreado }: {
  onClose: () => void; onCreado: (mozo: Mozo) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [verPass, setVerPass] = useState(false);
  const [form, setForm]       = useState({ nombre: "", email: "", password: "" });

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) { setError(data.error ?? "Error al crear."); return; }

      toast.success(`${form.nombre.split(" ")[0]} fue agregado al equipo`);
      onCreado(data);
    } catch {
      setLoading(false);
      setError("Error de conexión.");
    }
  }

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <UserPlus size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-gray-800 font-black text-base">Nuevo mozo</h2>
            <p className="text-gray-400 text-xs font-medium">Queda activo inmediatamente</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">

          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Nombre completo *</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required autoFocus
                value={form.nombre}
                onChange={(e) => update("nombre", e.target.value)}
                placeholder="Ej: Martín López"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-700 text-sm font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-500 transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Email *</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="martin@email.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-700 text-sm font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-500 transition"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Contraseña *</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type={verPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-gray-700 text-sm font-bold placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-500 transition"
              />
              <button type="button" onClick={() => setVerPass(!verPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-gray-400 text-xs mt-1.5 font-medium">
              Vos le pasás estas credenciales al mozo para que ingrese.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-600 text-xs font-bold">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-md active:scale-95">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Crear mozo
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR MOZO
// ════════════════════════════════════════════════════════════════════════════════
function ModalEditarMozo({ mozo, onClose, onUpdated }: {
  mozo: Mozo; onClose: () => void; onUpdated: (m: Mozo) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [verPass, setVerPass] = useState(false);
  const [form, setForm]       = useState({
    nombre: mozo.nombre, email: mozo.email, password: "",
  });

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = { nombre: form.nombre, email: form.email };
      if (form.password) body.password = form.password;

      const res = await fetch(`/api/admin/equipo/${mozo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) { setError(data.error ?? "Error al actualizar."); return; }

      toast.success("Mozo actualizado");
      onUpdated(data);
    } catch {
      setLoading(false);
      setError("Error de conexión.");
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Pencil size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-gray-800 font-black text-base">Editar mozo</h2>
            <p className="text-gray-400 text-xs font-medium">{mozo.nombre}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1"><X size={18} /></button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Nombre completo</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required autoFocus value={form.nombre} onChange={(e) => update("nombre", e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-700 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-700 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">
              Nueva contraseña <span className="text-gray-300 normal-case">(dejar vacío para no cambiar)</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type={verPass ? "text" : "password"} value={form.password}
                onChange={(e) => update("password", e.target.value)} placeholder="••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-gray-700 text-sm font-bold placeholder-gray-300 outline-none focus:ring-2 focus:ring-red-500 transition" />
              <button type="button" onClick={() => setVerPass(!verPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-600 text-xs font-bold">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-md active:scale-95">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: CONFIRMACIÓN
// ════════════════════════════════════════════════════════════════════════════════
function ModalConfirmar({ titulo, mensaje, labelOk, loading, onClose, onConfirm }: {
  titulo: string; mensaje: string; labelOk: string;
  loading: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onClose} ancho="max-w-sm">
      <div className="px-6 py-6 space-y-3 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-gray-800 font-black text-base">{titulo}</h2>
        <p className="text-gray-500 text-sm leading-relaxed">{mensaje}</p>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <button onClick={onClose} disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 transition">
          Cancelar
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-red-100 active:scale-95">
          {loading && <Loader2 size={14} className="animate-spin" />}{labelOk}
        </button>
      </div>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// UI BLOCKS
// ════════════════════════════════════════════════════════════════════════════════
function ModalShell({ children, onClose, ancho = "max-w-md" }: {
  children: React.ReactNode; onClose: () => void; ancho?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${ancho} bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95`}>
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════
export default function EquipoPage() {
  const [mozos, setMozos]       = useState<Mozo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro]     = useState<"todos" | "activos" | "inactivos">("todos");

  const [modalCrear, setModalCrear]           = useState(false);
  const [modalEditar, setModalEditar]         = useState<Mozo | null>(null);
  const [modalEliminar, setModalEliminar]     = useState<Mozo | null>(null);
  const [loadingEliminar, setLoadingEliminar] = useState(false);

  useEffect(() => {
    fetch("/api/admin/equipo")
      .then((r) => r.json())
      .then((data) => { setMozos(data); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  async function toggleActivo(mozo: Mozo) {
    const nuevoEstado = !mozo.activo;
    try {
      const res = await fetch(`/api/admin/equipo/${mozo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevoEstado }),
      });
      if (res.ok) {
        setMozos((prev) => prev.map((m) => m.id === mozo.id ? { ...m, activo: nuevoEstado } : m));
        toast.success(nuevoEstado ? `${mozo.nombre.split(" ")[0]} activado` : `${mozo.nombre.split(" ")[0]} desactivado`);
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error");
      }
    } catch { toast.error("Error de conexión"); }
  }

  async function handleEliminar() {
    if (!modalEliminar) return;
    setLoadingEliminar(true);
    try {
      const res = await fetch(`/api/admin/equipo/${modalEliminar.id}`, { method: "DELETE" });
      if (res.ok) {
        setMozos((prev) => prev.filter((m) => m.id !== modalEliminar.id));
        toast.success("Mozo eliminado");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Error");
      }
    } catch { toast.error("Error de conexión"); }
    setLoadingEliminar(false);
    setModalEliminar(null);
  }

  const mozosFiltrados = mozos.filter((m) => {
    const q = busqueda.toLowerCase();
    const matchBusqueda = m.nombre.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchFiltro = filtro === "todos" || (filtro === "activos" ? m.activo : !m.activo);
    return matchBusqueda && matchFiltro;
  });

  const activos   = mozos.filter((m) => m.activo).length;
  const inactivos = mozos.filter((m) => !m.activo).length;

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <Users className="text-red-600" size={32} />
            Equipo
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            {mozos.length} mozo{mozos.length !== 1 ? "s" : ""} · {activos} activo{activos !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setModalCrear(true)}
          className="px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 bg-gray-900 text-white hover:bg-black">
          <Plus size={18} /> Nuevo Mozo
        </button>
      </div>

      {/* ── BÚSQUEDA Y FILTROS ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition" />
        </div>
        <div className="flex gap-1.5 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
          {([
            { key: "todos",     label: "Todos",     count: mozos.length },
            { key: "activos",   label: "Activos",   count: activos },
            { key: "inactivos", label: "Inactivos", count: inactivos },
          ] as const).map((f) => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                filtro === f.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}>
              {f.label}
              <span className={`text-[10px] ${filtro === f.key ? "text-gray-400" : "text-gray-300"}`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTA ──────────────────────────────────────────────────────────── */}
      {cargando ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Cargando equipo…</p>
        </div>
      ) : mozos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
            <Users size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold">Todavía no tenés mozos</p>
          <p className="text-gray-400 text-sm">Creá el primero para que pueda operar mesas y pedidos.</p>
          <button onClick={() => setModalCrear(true)}
            className="mt-2 flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-md active:scale-95">
            <UserPlus size={16} /> Agregar mozo
          </button>
        </div>
      ) : mozosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-2">
          <Search size={28} className="text-gray-300" />
          <p className="text-gray-400 text-sm font-medium">No hay resultados para &quot;{busqueda}&quot;</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Cabecera tabla */}
          <div className="grid grid-cols-12 bg-gray-50 px-5 py-3 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-5">Mozo</div>
            <div className="col-span-3 hidden sm:block">Email</div>
            <div className="col-span-2 hidden sm:block text-center">Alta</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {/* Filas */}
          <div className="divide-y divide-gray-100">
            {mozosFiltrados.map((mozo) => (
              <div key={mozo.id}
                className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-gray-50 transition-colors group ${
                  !mozo.activo ? "opacity-50" : ""
                }`}>

                {/* Nombre + avatar + badge */}
                <div className="col-span-5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    mozo.activo
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>
                    {iniciales(mozo.nombre)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 text-sm">{mozo.nombre}</p>
                      {mozo.activo ? (
                        <span className="hidden sm:inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Activo
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center gap-1 bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {/* Email en mobile */}
                    <p className="text-gray-400 text-xs mt-0.5 sm:hidden truncate">{mozo.email}</p>
                  </div>
                </div>

                {/* Email desktop */}
                <div className="col-span-3 hidden sm:block">
                  <p className="text-gray-500 text-sm truncate">{mozo.email}</p>
                </div>

                {/* Fecha alta */}
                <div className="col-span-2 hidden sm:block text-center">
                  <p className="text-gray-400 text-xs font-medium">{fechaCorta(mozo.fechaAlta)}</p>
                </div>

                {/* Acciones */}
                <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleActivo(mozo)}
                    title={mozo.activo ? "Desactivar" : "Activar"}
                    className={`p-2 rounded-lg transition-colors ${
                      mozo.activo
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}>
                    <Power size={16} />
                  </button>
                  <button onClick={() => setModalEditar(mozo)}
                    className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Editar">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setModalEliminar(mozo)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALES ────────────────────────────────────────────────────────── */}
      {modalCrear && (
        <ModalCrearMozo
          onClose={() => setModalCrear(false)}
          onCreado={(m) => { setMozos((prev) => [m, ...prev]); setModalCrear(false); }}
        />
      )}
      {modalEditar && (
        <ModalEditarMozo
          mozo={modalEditar}
          onClose={() => setModalEditar(null)}
          onUpdated={(m) => { setMozos((prev) => prev.map((x) => x.id === m.id ? m : x)); setModalEditar(null); }}
        />
      )}
      {modalEliminar && (
        <ModalConfirmar
          titulo={`¿Eliminar a ${modalEliminar.nombre}?`}
          mensaje="Se eliminará permanentemente del sistema. Esta acción no se puede deshacer."
          labelOk="Eliminar"
          loading={loadingEliminar}
          onClose={() => { setModalEliminar(null); setLoadingEliminar(false); }}
          onConfirm={handleEliminar}
        />
      )}
    </div>
  );
}