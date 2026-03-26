"use client";
import { useState } from "react";
import useSWR from "swr";
import {
  Vault, Plus, Trash2, Loader2, ChevronDown, ChevronUp,
  Clock, Banknote, CreditCard, QrCode, ArrowDownLeft, CheckCircle2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

export default function CajaPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/caja", fetcher, { revalidateOnFocus: true });

  const turno = data?.turnoActivo ?? null;
  const historial: any[] = data?.historial ?? [];

  // ── Estados UI ──────────────────────────────────────────────────────────
  const [efectivoInicial, setEfectivoInicial] = useState("");
  const [notasApertura, setNotasApertura]     = useState("");
  const [abriendo, setAbriendo]               = useState(false);

  const [retiroMonto, setRetiroMonto]         = useState("");
  const [retiroDesc, setRetiroDesc]           = useState("");
  const [guardandoRetiro, setGuardandoRetiro] = useState(false);
  const [eliminandoRetiro, setEliminandoRetiro] = useState<number | null>(null);

  const [modalCierre, setModalCierre]         = useState(false);
  const [efectivoFinal, setEfectivoFinal]     = useState("");
  const [cerrando, setCerrando]               = useState(false);
  const [resumenCierre, setResumenCierre]     = useState<any | null>(null);

  const [historialAbierto, setHistorialAbierto] = useState(false);

  // ── Abrir turno ─────────────────────────────────────────────────────────
  const abrirTurno = async () => {
    setAbriendo(true);
    try {
      const res = await fetch("/api/admin/caja/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efectivoInicial: Number(efectivoInicial) || 0, notas: notasApertura }),
      });
      if (res.ok) {
        toast.success("¡Turno abierto!");
        setEfectivoInicial("");
        setNotasApertura("");
        mutate();
      } else {
        const d = await res.json();
        toast.error(d.error || "Error al abrir turno");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setAbriendo(false); }
  };

  // ── Agregar retiro ───────────────────────────────────────────────────────
  const agregarRetiro = async () => {
    if (!retiroMonto || !retiroDesc.trim()) { toast.error("Completá monto y descripción"); return; }
    setGuardandoRetiro(true);
    try {
      const res = await fetch("/api/admin/caja/retiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: Number(retiroMonto), descripcion: retiroDesc.trim() }),
      });
      if (res.ok) {
        toast.success("Retiro registrado");
        setRetiroMonto("");
        setRetiroDesc("");
        mutate();
      } else {
        const d = await res.json();
        toast.error(d.error || "Error");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setGuardandoRetiro(false); }
  };

  // ── Eliminar retiro ──────────────────────────────────────────────────────
  const eliminarRetiro = async (id: number) => {
    setEliminandoRetiro(id);
    try {
      await fetch(`/api/admin/caja/retiro/${id}`, { method: "DELETE" });
      mutate();
    } catch { toast.error("Error al eliminar"); }
    finally { setEliminandoRetiro(null); }
  };

  // ── Cerrar turno ─────────────────────────────────────────────────────────
  const cerrarTurno = async () => {
    setCerrando(true);
    try {
      const res = await fetch("/api/admin/caja/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efectivoFinal: Number(efectivoFinal) || 0 }),
      });
      if (res.ok) {
        const d = await res.json();
        setResumenCierre(d.resumen);
        mutate();
      } else {
        const d = await res.json();
        toast.error(d.error || "Error al cerrar turno");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setCerrando(false); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-slate-400" size={36} />
      </div>
    );
  }

  // ── Resumen post-cierre ──────────────────────────────────────────────────
  if (resumenCierre) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2.5 rounded-xl">
            <CheckCircle2 size={22} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Turno cerrado</h1>
            <p className="text-sm text-gray-500 font-medium">Resumen del servicio</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
          <ResumenFila label="Efectivo" valor={resumenCierre.efectivo} icono={Banknote} />
          <ResumenFila label="Tarjeta" valor={resumenCierre.tarjeta} icono={CreditCard} />
          <ResumenFila label="QR / Digital" valor={resumenCierre.qr} icono={QrCode} />
          <div className="px-5 py-4 flex justify-between items-center bg-slate-50">
            <span className="font-black text-slate-700 uppercase text-sm tracking-wide">Total ingresos</span>
            <span className="font-black text-xl text-slate-900">{fmt(resumenCierre.total)}</span>
          </div>
          <ResumenFila label="Total retiros" valor={-resumenCierre.totalRetiros} icono={ArrowDownLeft} negativo />
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="font-bold text-slate-500 text-sm">Efectivo esperado en caja</span>
            <span className="font-black text-slate-800">{fmt(resumenCierre.efectivoEsperado)}</span>
          </div>
          <div className={`px-5 py-4 flex justify-between items-center ${resumenCierre.diferencia >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <span className="font-bold text-sm text-slate-700">Diferencia</span>
            <span className={`font-black text-lg ${resumenCierre.diferencia >= 0 ? "text-green-700" : "text-red-600"}`}>
              {resumenCierre.diferencia >= 0 ? "+" : ""}{fmt(resumenCierre.diferencia)}
            </span>
          </div>
        </div>

        <p className="text-xs text-center text-gray-400 font-medium">
          {resumenCierre.sesiones} {resumenCierre.sesiones === 1 ? "mesa cerrada" : "mesas cerradas"} en este turno
        </p>

        <button onClick={() => { setResumenCierre(null); setModalCierre(false); setEfectivoFinal(""); }}
          className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-black text-base active:scale-95 transition-all">
          Listo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-slate-100 p-2.5 rounded-xl">
          <Vault size={22} className="text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Caja</h1>
          <p className="text-sm font-medium text-gray-500">
            {turno ? "Turno en curso" : "Sin turno activo"}
          </p>
        </div>
        {turno && (
          <span className="ml-auto bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
            ABIERTA
          </span>
        )}
        {!turno && (
          <span className="ml-auto bg-red-100 text-red-600 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
            CERRADA
          </span>
        )}
      </div>

      {/* ── SIN TURNO: formulario de apertura ── */}
      {!turno && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="font-black text-gray-800 text-lg">Abrir turno</h2>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
              Efectivo inicial en caja ($)
            </label>
            <input
              type="number" min="0" value={efectivoInicial}
              onChange={(e) => setEfectivoInicial(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-black focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
              Notas <span className="font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="text" value={notasApertura}
              onChange={(e) => setNotasApertura(e.target.value)}
              placeholder="Ej: Lunes noche, feriado..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <button onClick={abrirTurno} disabled={abriendo}
            className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
            {abriendo ? <Loader2 size={18} className="animate-spin" /> : <><Vault size={18} /> Abrir turno</>}
          </button>
        </div>
      )}

      {/* ── CON TURNO ACTIVO ── */}
      {turno && (
        <>
          {/* Info del turno */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-1">
              <Clock size={14} />
              Abierto el {new Date(turno.fechaApertura).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} a las {new Date(turno.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Efectivo inicial:</span>
              <span className="text-lg font-black text-gray-900">{fmt(turno.efectivoInicial)}</span>
            </div>
            {turno.notas && <p className="text-sm text-gray-400 italic mt-1">{turno.notas}</p>}
          </div>

          {/* Retiros */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h2 className="font-black text-gray-800">Retiros de caja</h2>

            {turno.retiros.length === 0 && (
              <p className="text-sm text-gray-400 font-medium">Sin retiros registrados.</p>
            )}

            {turno.retiros.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div>
                  <p className="font-bold text-sm text-gray-800">{r.descripcion}</p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    {new Date(r.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-red-600 text-sm">-{fmt(r.monto)}</span>
                  <button onClick={() => eliminarRetiro(r.id)} disabled={eliminandoRetiro === r.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors active:scale-95">
                    {eliminandoRetiro === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}

            {/* Formulario nuevo retiro */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Registrar retiro</p>
              <div className="flex gap-2">
                <input type="number" min="1" value={retiroMonto}
                  onChange={(e) => setRetiroMonto(e.target.value)}
                  placeholder="Monto $"
                  className="w-28 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <input type="text" value={retiroDesc}
                  onChange={(e) => setRetiroDesc(e.target.value)}
                  placeholder="Descripción"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <button onClick={agregarRetiro} disabled={guardandoRetiro}
                  className="p-2.5 bg-slate-900 text-white rounded-xl active:scale-95 transition-all disabled:opacity-50">
                  {guardandoRetiro ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Botón cerrar turno */}
          <button onClick={() => setModalCierre(true)}
            className="w-full py-4 rounded-xl bg-red-600 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-red-100 hover:bg-red-700">
            Cerrar turno
          </button>
        </>
      )}

      {/* ── HISTORIAL DE TURNOS ── */}
      {historial.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button onClick={() => setHistorialAbierto(!historialAbierto)}
            className="w-full px-5 py-4 flex items-center justify-between font-black text-gray-700 hover:bg-gray-50 transition-colors">
            <span>Historial ({historial.length} turnos)</span>
            {historialAbierto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {historialAbierto && (
            <div className="divide-y divide-gray-100">
              {historial.map((t: any) => (
                <div key={t.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm text-gray-800">
                        {new Date(t.fechaApertura).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        {new Date(t.fechaApertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} →{" "}
                        {new Date(t.fechaCierre).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="font-black text-gray-900">{fmt(t.resumen.total)}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><Banknote size={11} />{fmt(t.resumen.efectivo)}</span>
                    <span className="flex items-center gap-1"><CreditCard size={11} />{fmt(t.resumen.tarjeta)}</span>
                    <span className="flex items-center gap-1"><QrCode size={11} />{fmt(t.resumen.qr)}</span>
                    {t.retiros.length > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <ArrowDownLeft size={11} />
                        -{fmt(t.retiros.reduce((a: number, r: any) => a + r.monto, 0))}
                      </span>
                    )}
                  </div>
                  {t.notas && <p className="text-xs text-gray-400 italic">{t.notas}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL CIERRE ── */}
      {modalCierre && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModalCierre(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="px-5 pb-2 pt-2 flex items-start justify-between">
              <h3 className="font-black text-xl text-slate-900">Cerrar turno</h3>
              <button onClick={() => setModalCierre(false)}
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={18} className="text-slate-600" />
              </button>
            </div>
            <div className="px-5 pb-8 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                  ¿Cuánto efectivo hay en caja? ($)
                </label>
                <input type="number" min="0" value={efectivoFinal}
                  onChange={(e) => setEfectivoFinal(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-2xl font-black focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <button onClick={cerrarTurno} disabled={cerrando}
                className="w-full py-4 rounded-xl bg-red-600 text-white font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                {cerrando ? <Loader2 size={18} className="animate-spin" /> : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenFila({ label, valor, icono: Icono, negativo }: { label: string; valor: number; icono: any; negativo?: boolean }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <Icono size={14} className="text-slate-400" />
        {label}
      </div>
      <span className={`font-black text-sm ${negativo ? "text-red-600" : "text-slate-800"}`}>
        {negativo && valor !== 0 ? "" : ""}{fmt(Math.abs(valor))}
      </span>
    </div>
  );
}
