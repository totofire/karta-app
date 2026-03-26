"use client";
import { useState, useMemo } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Plus, ChevronLeft, ChevronRight, X, Loader2, Users,
  Phone, Calendar, CheckCircle2, XCircle, Clock, Pencil,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA";

interface Mesa      { id: number; nombre: string }
interface Reserva   {
  id: number; nombre: string; telefono: string | null;
  fecha: string; personas: number; estado: EstadoReserva;
  notas: string | null; mesaId: number | null; mesa: Mesa | null;
}

const ESTADO_STYLES: Record<EstadoReserva, string> = {
  PENDIENTE:   "bg-yellow-100 text-yellow-700",
  CONFIRMADA:  "bg-green-100 text-green-700",
  CANCELADA:   "bg-red-100 text-red-500",
  COMPLETADA:  "bg-slate-100 text-slate-500",
};

const ESTADO_LABELS: Record<EstadoReserva, string> = {
  PENDIENTE:  "Pendiente",
  CONFIRMADA: "Confirmada",
  CANCELADA:  "Cancelada",
  COMPLETADA: "Completada",
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function fechaISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function horaDeISO(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FORM_VACIO = {
  nombre: "", telefono: "", fecha: "", hora: "",
  personas: 2, notas: "", mesaId: "" as string | number,
};

export default function ReservasPage() {
  const hoy = new Date();
  const [vista, setVista]         = useState<"calendario" | "lista">("calendario");
  const [mes, setMes]             = useState(hoy.getMonth());
  const [anio, setAnio]           = useState(hoy.getFullYear());
  const [diaSeleccionado, setDia] = useState(fechaISO(hoy));
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando]   = useState<Reserva | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm]           = useState(FORM_VACIO);

  const { data: reservasDia = [], mutate } = useSWR<Reserva[]>(
    `/api/admin/reservas?fecha=${diaSeleccionado}`, fetcher
  );
  const { data: mesas = [] } = useSWR<Mesa[]>("/api/admin/mesas", fetcher);

  // Todas las reservas del mes para el calendario
  const primerDiaMes = new Date(anio, mes, 1);
  const ultimoDiaMes = new Date(anio, mes + 1, 0);
  const { data: reservasMes = [] } = useSWR<Reserva[]>(
    `/api/admin/reservas?fecha=${fechaISO(primerDiaMes)}&hasta=${fechaISO(ultimoDiaMes)}`,
    fetcher
  );

  // Contar reservas por día para el calendario
  const contadorPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    reservasMes.forEach((r) => {
      const d = fechaISO(new Date(r.fecha));
      map[d] = (map[d] ?? 0) + 1;
    });
    return map;
  }, [reservasMes]);

  const set = (campo: string, valor: unknown) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const abrirNuevo = () => {
    setForm({ ...FORM_VACIO, fecha: diaSeleccionado });
    setEditando(null);
    setMostrarForm(true);
  };

  const abrirEditar = (r: Reserva) => {
    const d = new Date(r.fecha);
    setForm({
      nombre:   r.nombre,
      telefono: r.telefono ?? "",
      fecha:    fechaISO(d),
      hora:     horaDeISO(r.fecha),
      personas: r.personas,
      notas:    r.notas ?? "",
      mesaId:   r.mesaId ?? "",
    });
    setEditando(r);
    setMostrarForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error("Ingresá un nombre"); return; }
    if (!form.fecha || !form.hora) { toast.error("Ingresá fecha y hora"); return; }

    const fechaISO_str = `${form.fecha}T${form.hora}:00.000Z`;
    const body = {
      nombre:   form.nombre,
      telefono: form.telefono || null,
      fecha:    fechaISO_str,
      personas: Number(form.personas),
      notas:    form.notas || null,
      mesaId:   form.mesaId !== "" ? Number(form.mesaId) : null,
    };

    setGuardando(true);
    try {
      const url    = editando ? `/api/admin/reservas/${editando.id}` : "/api/admin/reservas";
      const method = editando ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Error"); return; }
      toast.success(editando ? "Reserva actualizada" : "Reserva creada");
      setMostrarForm(false);
      setEditando(null);
      mutate();
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (r: Reserva, estado: EstadoReserva) => {
    await fetch(`/api/admin/reservas/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    toast.success(`Reserva ${ESTADO_LABELS[estado].toLowerCase()}`);
    mutate();
  };

  const eliminar = async (id: number) => {
    await fetch(`/api/admin/reservas/${id}`, { method: "DELETE" });
    toast.success("Reserva eliminada");
    mutate();
  };

  // ── Calendario ──────────────────────────────────────────────────────────────
  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7; // lunes=0
  const diasEnMes       = new Date(anio, mes + 1, 0).getDate();
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const prevMes = () => { if (mes === 0) { setMes(11); setAnio(a => a - 1); } else setMes(m => m - 1); };
  const nextMes = () => { if (mes === 11) { setMes(0); setAnio(a => a + 1); } else setMes(m => m + 1); };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Reservas</h1>
          <p className="text-slate-500 text-sm mt-1">Gestioná las reservas del local</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(["calendario", "lista"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all
                  ${vista === v ? "bg-white shadow text-slate-900" : "text-slate-400"}`}
              >
                {v === "calendario" ? "Calendario" : "Lista"}
              </button>
            ))}
          </div>
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
          >
            <Plus size={16} />
            Nueva reserva
          </button>
        </div>
      </div>

      {/* Vista Calendario */}
      {vista === "calendario" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Navegación del mes */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button onClick={prevMes} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="font-black text-slate-800 text-base">
              {MESES[mes]} {anio}
            </span>
            <button onClick={nextMes} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => (
              <div key={d} className="text-center py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7">
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 border-b border-r border-slate-50" />
            ))}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia    = i + 1;
              const key    = `${anio}-${pad(mes + 1)}-${pad(dia)}`;
              const count  = contadorPorDia[key] ?? 0;
              const esHoy  = key === fechaISO(hoy);
              const esSel  = key === diaSeleccionado;
              return (
                <button
                  key={key}
                  onClick={() => { setDia(key); setVista("lista"); }}
                  className={`h-16 border-b border-r border-slate-50 flex flex-col items-center justify-center gap-1
                    transition-all hover:bg-slate-50 relative
                    ${esSel ? "bg-red-50" : ""}`}
                >
                  <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-full
                    ${esHoy ? "bg-red-600 text-white" : esSel ? "text-red-600" : "text-slate-700"}`}>
                    {dia}
                  </span>
                  {count > 0 && (
                    <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista Lista */}
      {vista === "lista" && (
        <div className="space-y-3">
          {/* Selector de fecha en lista */}
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={diaSeleccionado}
              onChange={(e) => setDia(e.target.value)}
              className="flex-1 text-sm font-bold text-slate-700 focus:outline-none"
            />
            <span className="text-xs text-slate-400 font-bold">
              {reservasDia.length} reserva{reservasDia.length !== 1 ? "s" : ""}
            </span>
          </div>

          {reservasDia.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Sin reservas para este día</p>
            </div>
          ) : (
            reservasDia.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border-2 border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-black text-slate-800">{r.nombre}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ESTADO_STYLES[r.estado]}`}>
                        {ESTADO_LABELS[r.estado]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {horaDeISO(r.fecha)}hs
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {r.personas} pers.
                      </span>
                      {r.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {r.telefono}
                        </span>
                      )}
                      {r.mesa && (
                        <span className="font-bold text-slate-600">Mesa {r.mesa.nombre}</span>
                      )}
                    </div>
                    {r.notas && (
                      <p className="text-xs text-slate-400 italic mt-1">{r.notas}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {r.estado === "PENDIENTE" && (
                      <button
                        onClick={() => cambiarEstado(r, "CONFIRMADA")}
                        className="p-2 rounded-xl hover:bg-green-50 text-slate-300 hover:text-green-600 transition-colors"
                        title="Confirmar"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {r.estado === "CONFIRMADA" && (
                      <button
                        onClick={() => cambiarEstado(r, "COMPLETADA")}
                        className="p-2 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-slate-600 transition-colors"
                        title="Marcar completada"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => abrirEditar(r)}
                      className="p-2 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-slate-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => eliminar(r.id)}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal form */}
      {mostrarForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setMostrarForm(false)}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">
                {editando ? "Editar reserva" : "Nueva reserva"}
              </h3>
              <button
                onClick={() => setMostrarForm(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  Nombre del cliente
                </label>
                <input
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Ej: García"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  Teléfono
                </label>
                <input
                  value={form.telefono}
                  onChange={(e) => set("telefono", e.target.value)}
                  placeholder="Ej: 11 1234-5678"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => set("fecha", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => set("hora", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Personas y mesa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Personas
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.personas}
                    onChange={(e) => set("personas", Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    Mesa (opcional)
                  </label>
                  <select
                    value={form.mesaId}
                    onChange={(e) => set("mesaId", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Sin asignar</option>
                    {mesas.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  Notas
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) => set("notas", e.target.value)}
                  placeholder="Ej: cumpleaños, alérgico al maní..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <button
                onClick={guardar}
                disabled={guardando}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editando ? "Guardar cambios" : "Crear reserva"}
              </button>

              <div className="h-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
