"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Store, TrendingUp, Clock, ShieldAlert,
  Loader2, AlertCircle, CheckCircle2, X,
  ChevronDown, Search, MoreHorizontal,
  Building2, Users, BadgeCheck,
  Pencil, Trash2, RefreshCcw, Ban, Power,
  Eye, DollarSign, Receipt, MessageCircle, Copy,
  LogOut, CreditCard, Mail
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Alerta {
  tipo: "TRIAL_POR_VENCER" | "PAGO_VENCIDO" | "INACTIVO" | "INVITE_VENCIDO";
  severidad: "alta" | "media";
  localId: number;
  localNombre: string;
  detalle: string;
}

interface LocalRow {
  id:         number;
  nombre:     string;
  slug:       string | null;
  estado:     string;
  plan:       string;
  montoPlan:  number;
  trialHasta: string | null;
  fechaVence: string | null;
  fechaAlta:  string;
  notasAdmin: string | null;
  admin:      { nombre: string; email: string; activo: boolean } | null;
  mesas:      number;
  mes: {
    ventaTotal:     number;
    sesiones:       number;
    ticketPromedio: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, { label: string; cls: string; dotCls: string }> = {
  ACTIVO:     { label: "Activo",     cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dotCls: "bg-emerald-400" },
  DEMO:       { label: "Trial",      cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",         dotCls: "bg-blue-400" },
  SUSPENDIDO: { label: "Suspendido", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",      dotCls: "bg-amber-400" },
  BAJA:       { label: "Baja",       cls: "bg-red-500/10 text-red-400 border-red-500/20",            dotCls: "bg-red-400" },
};

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  DEMO:       { label: "Demo",       cls: "text-blue-400 bg-blue-500/10" },
  BASIC:      { label: "Basic",      cls: "text-gray-400 bg-gray-500/10" },
  PRO:        { label: "Pro",        cls: "text-violet-400 bg-violet-500/10" },
  ENTERPRISE: { label: "Enterprise", cls: "text-amber-400 bg-amber-500/10" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}

function fechaCorta(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function diasRestantes(fecha: string | null) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function buildWhatsAppUrl(nombreAdmin: string, nombreLocal: string, inviteUrl: string) {
  const nombre = nombreAdmin.split(" ")[0];
  const msg = `¡Hola ${nombre}! 👋\n\nTu local *${nombreLocal}* ya está registrado en *Karta*.\n\nPara empezar, activá tu cuenta con este link:\n${inviteUrl}\n\n⏳ El link vence en 48hs.\n\nCualquier duda, avisame.`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

async function copiarAlClipboard(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success("Link copiado", { duration: 2000 });
  } catch {
    toast.error("No se pudo copiar");
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// DROPDOWN ACCIONES
// ════════════════════════════════════════════════════════════════════════════════
function AccionesDropdown({
  local, onEditar, onReenviarInvite, onCambiarEstado, onEliminar, onVerDetalle,
}: {
  local: LocalRow; onEditar: () => void; onReenviarInvite: () => void;
  onCambiarEstado: (e: string) => void; onEliminar: () => void; onVerDetalle: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pendiente = local.admin && !local.admin.activo;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAbierto(!abierto)}
        className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition">
        <MoreHorizontal size={16} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 py-1">
          <DDItem icon={<Eye size={14} />} label="Ver detalle"
            onClick={() => { onVerDetalle(); setAbierto(false); }} />
          <DDItem icon={<Pencil size={14} />} label="Editar local"
            onClick={() => { onEditar(); setAbierto(false); }} />
          {pendiente && (
            <DDItem icon={<MessageCircle size={14} />} label="Reenviar invitación"
              cls="text-green-400 hover:bg-green-500/10"
              onClick={() => { onReenviarInvite(); setAbierto(false); }} />
          )}
          <div className="border-t border-gray-700 my-1" />
          {local.estado !== "ACTIVO" && local.estado !== "BAJA" && (
            <DDItem icon={<Power size={14} />} label="Activar"
              cls="text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => { onCambiarEstado("ACTIVO"); setAbierto(false); }} />
          )}
          {local.estado === "ACTIVO" && (
            <DDItem icon={<Ban size={14} />} label="Suspender"
              cls="text-amber-400 hover:bg-amber-500/10"
              onClick={() => { onCambiarEstado("SUSPENDIDO"); setAbierto(false); }} />
          )}
          <div className="border-t border-gray-700 my-1" />
          {local.estado !== "BAJA" && (
            <DDItem icon={<Trash2 size={14} />} label="Dar de baja"
              cls="text-red-400 hover:bg-red-500/10"
              onClick={() => { onEliminar(); setAbierto(false); }} />
          )}
        </div>
      )}
    </div>
  );
}

function DDItem({ icon, label, cls = "text-gray-300 hover:bg-gray-700", onClick }: {
  icon: React.ReactNode; label: string; cls?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition ${cls}`}>
      {icon}{label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: NUEVO LOCAL (simplificado — sin plan/trial)
// ════════════════════════════════════════════════════════════════════════════════
function ModalNuevoLocal({ onClose, onCreated }: {
  onClose: () => void; onCreated: (local: LocalRow) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({
    nombreLocal: "", direccion: "", nombreAdmin: "", emailAdmin: "",
  });

  const [creado, setCreado] = useState<{
    inviteUrl: string; nombreAdmin: string; nombreLocal: string; localRow: LocalRow;
  } | null>(null);

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/superadmin/locales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) { setError(data.error ?? "Ocurrió un error."); return; }

      const localRow: LocalRow = {
        id: data.local.id, nombre: data.local.nombre, slug: data.local.slug,
        estado: "ACTIVO", plan: "BASIC", montoPlan: 0,
        trialHasta: null, fechaVence: null,
        fechaAlta: new Date().toISOString(), notasAdmin: null,
        admin: { nombre: form.nombreAdmin, email: form.emailAdmin, activo: false },
        mesas: 0, mes: { ventaTotal: 0, sesiones: 0, ticketPromedio: 0 },
      };

      setCreado({
        inviteUrl: data.inviteUrl,
        nombreAdmin: form.nombreAdmin,
        nombreLocal: form.nombreLocal,
        localRow,
      });
    } catch {
      setLoading(false);
      setError("Error de conexión.");
    }
  }

  // ── Pantalla de éxito con link + WhatsApp ───────────────────────────
  if (creado) {
    const wspUrl = buildWhatsAppUrl(creado.nombreAdmin, creado.nombreLocal, creado.inviteUrl);

    return (
      <ModalShell onClose={() => { onCreated(creado.localRow); onClose(); }}>
        <div className="px-6 py-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-white font-bold text-lg">¡{creado.nombreLocal} creado!</h2>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Mandále el link de activación a {creado.nombreAdmin.split(" ")[0]} por WhatsApp.
          </p>

          {/* Link copiable */}
          <div className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
            <p className="flex-1 text-xs text-gray-400 truncate font-mono">
              {creado.inviteUrl}
            </p>
            <button
              onClick={() => copiarAlClipboard(creado.inviteUrl)}
              className="shrink-0 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
              title="Copiar link"
            >
              <Copy size={14} />
            </button>
          </div>

          <div className="w-full flex gap-3">
            <a href={wspUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-3 rounded-xl transition text-sm">
              <MessageCircle size={16} /> Enviar por WhatsApp
            </a>
            <button onClick={() => { onCreated(creado.localRow); onClose(); }}
              className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 hover:text-gray-300 transition">
              Listo
            </button>
          </div>

          <p className="text-gray-600 text-xs mt-4">El link expira en 48hs. Podés reenviarlo desde el menú de acciones.</p>
        </div>
      </ModalShell>
    );
  }

  // ── Formulario de creación ──────────────────────────────────────────
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Building2 size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Nuevo local</h2>
            <p className="text-gray-500 text-xs">Se genera un link de activación para el dueño</p>
          </div>
        </div>
        <BtnCerrar onClick={onClose} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <SeccionLabel texto="Datos del local" />
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>Nombre del local *</Label>
              <Input required value={form.nombreLocal}
                onChange={(v) => update("nombreLocal", v)} placeholder="Ej: Bar El Toro" />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.direccion}
                onChange={(v) => update("direccion", v)} placeholder="Ej: Corrientes 1234, CABA" />
            </div>
          </div>

          <SeccionLabel texto="Dueño / Admin" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nombre *</Label>
              <Input required value={form.nombreAdmin}
                onChange={(v) => update("nombreAdmin", v)} placeholder="Juan Pérez" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input required type="email" value={form.emailAdmin}
                onChange={(v) => update("emailAdmin", v)} placeholder="juan@bar.com" />
            </div>
          </div>

          {error && <ErrorBox msg={error} />}
        </div>

        <FooterModal onClose={onClose} loading={loading} labelOk="Crear local" />
      </form>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: INVITE (reenvío — link + WhatsApp)
// ════════════════════════════════════════════════════════════════════════════════
function ModalInvite({ local, inviteUrl, onClose }: {
  local: LocalRow; inviteUrl: string; onClose: () => void;
}) {
  const wspUrl = buildWhatsAppUrl(local.admin?.nombre ?? "Admin", local.nombre, inviteUrl);

  return (
    <ModalShell onClose={onClose} ancho="max-w-md">
      <div className="px-6 py-8 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <MessageCircle className="w-7 h-7 text-green-400" />
        </div>
        <h2 className="text-white font-semibold text-base">Invitación regenerada</h2>
        <p className="text-gray-400 text-sm mt-1 mb-5">
          Nuevo link para <strong className="text-white">{local.admin?.nombre}</strong> de {local.nombre}
        </p>
        <div className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
          <p className="flex-1 text-xs text-gray-400 truncate font-mono">{inviteUrl}</p>
          <button onClick={() => copiarAlClipboard(inviteUrl)}
            className="shrink-0 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition">
            <Copy size={14} />
          </button>
        </div>
        <div className="w-full flex gap-3">
          <a href={wspUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-3 rounded-xl transition text-sm">
            <MessageCircle size={16} /> Enviar por WhatsApp
          </a>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition">
            Cerrar
          </button>
        </div>
        <p className="text-gray-600 text-xs mt-4">Expira en 48hs.</p>
      </div>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR LOCAL (plan, estado, monto, notas — para cuando empieces a cobrar)
// ════════════════════════════════════════════════════════════════════════════════
function ModalEditarLocal({ local, onClose, onUpdated }: {
  local: LocalRow; onClose: () => void;
  onUpdated: (u: Partial<LocalRow> & { id: number }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({
    estado:     local.estado,
    plan:       local.plan,
    montoPlan:  String(local.montoPlan),
    notasAdmin: local.notasAdmin ?? "",
  });

  function update(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/locales/${local.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: form.estado, plan: form.plan,
          montoPlan: Number(form.montoPlan) || 0,
          notasAdmin: form.notasAdmin || null,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error ?? "Error al actualizar."); return; }
      toast.success("Local actualizado");
      onUpdated({
        id: local.id, estado: form.estado, plan: form.plan,
        montoPlan: Number(form.montoPlan) || 0, notasAdmin: form.notasAdmin || null,
      });
    } catch {
      setLoading(false);
      setError("Error de conexión.");
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Pencil size={16} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">Editar local</h2>
            <p className="text-gray-500 text-xs">{local.nombre}</p>
          </div>
        </div>
        <BtnCerrar onClick={onClose} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <SeccionLabel texto="Estado y plan" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onChange={(v) => update("estado", v)} opciones={[
                { value: "ACTIVO", label: "Activo" },
                { value: "SUSPENDIDO", label: "Suspendido" },
                { value: "BAJA", label: "Baja" },
              ]} />
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={form.plan} onChange={(v) => update("plan", v)} opciones={[
                { value: "BASIC", label: "Basic" },
                { value: "PRO", label: "Pro" },
                { value: "ENTERPRISE", label: "Enterprise" },
              ]} />
            </div>
          </div>

          <SeccionLabel texto="Facturación" />
          <div>
            <Label>Monto mensual ($)</Label>
            <Input type="number" min={0} value={form.montoPlan}
              onChange={(v) => update("montoPlan", v)} placeholder="0" />
          </div>

          <SeccionLabel texto="Notas internas" />
          <textarea value={form.notasAdmin}
            onChange={(e) => update("notasAdmin", e.target.value)}
            placeholder="Notas privadas sobre este local…" rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition resize-none" />

          {error && <ErrorBox msg={error} />}
        </div>
        <FooterModal onClose={onClose} loading={loading} labelOk="Guardar cambios" />
      </form>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: DETALLE
// ════════════════════════════════════════════════════════════════════════════════
function ModalDetalle({ local, onClose, onEditar, onReenviarInvite }: {
  local: LocalRow; onClose: () => void; onEditar: () => void; onReenviarInvite: () => void;
}) {
  const eb = ESTADO_BADGE[local.estado] ?? ESTADO_BADGE.BAJA;
  const pb = PLAN_BADGE[local.plan] ?? PLAN_BADGE.BASIC;
  const pendiente = local.admin && !local.admin.activo;

  return (
    <ModalShell onClose={onClose} ancho="max-w-xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
            <Store size={20} className="text-gray-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">{local.nombre}</h2>
            {local.slug && <p className="text-gray-600 text-xs">/{local.slug}</p>}
          </div>
        </div>
        <BtnCerrar onClick={onClose} />
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${eb.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${eb.dotCls}`} />{eb.label}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${pb.cls}`}>
            {pb.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKpi icon={<DollarSign size={14} className="text-emerald-400" />} label="Ventas mes" value={fmt(local.mes.ventaTotal)} />
          <MiniKpi icon={<Receipt size={14} className="text-blue-400" />} label="Sesiones" value={String(local.mes.sesiones)} />
          <MiniKpi icon={<TrendingUp size={14} className="text-violet-400" />} label="Ticket prom." value={local.mes.ticketPromedio > 0 ? fmt(local.mes.ticketPromedio) : "—"} />
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl divide-y divide-gray-700/50">
          <InfoRow label="Alta" value={fechaCorta(local.fechaAlta)} />
          <InfoRow label="Mesas activas" value={String(local.mesas)} />
          <InfoRow label="Monto mensual" value={local.montoPlan > 0 ? fmt(local.montoPlan) : "—"} />
        </div>

        <div>
          <SeccionLabel texto="Administrador" />
          {local.admin ? (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{local.admin.nombre}</p>
                  <p className="text-gray-500 text-xs">{local.admin.email}</p>
                </div>
                {pendiente ? (
                  <button onClick={onReenviarInvite}
                    className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition">
                    <MessageCircle size={12} /> Reenviar
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 size={12} /> Activo
                  </span>
                )}
              </div>
            </div>
          ) : <p className="text-gray-600 text-xs mt-2">Sin admin asignado</p>}
        </div>

        {local.notasAdmin && (
          <div>
            <SeccionLabel texto="Notas internas" />
            <p className="text-gray-400 text-sm mt-2 whitespace-pre-wrap">{local.notasAdmin}</p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition">
          Cerrar
        </button>
        <button onClick={onEditar}
          className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          <Pencil size={14} /> Editar
        </button>
      </div>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MODAL: CONFIRMACIÓN
// ════════════════════════════════════════════════════════════════════════════════
function ModalConfirmar({ titulo, mensaje, labelOk, colorOk = "bg-red-500 hover:bg-red-400",
  loading, onClose, onConfirm }: {
  titulo: string; mensaje: string; labelOk: string; colorOk?: string;
  loading: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onClose} ancho="max-w-sm">
      <div className="px-6 py-5 space-y-3">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-white font-semibold text-base text-center">{titulo}</h2>
        <p className="text-gray-400 text-sm text-center leading-relaxed">{mensaje}</p>
      </div>
      <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
        <button onClick={onClose} disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition">
          Cancelar
        </button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 ${colorOk}`}>
          {loading && <Loader2 size={14} className="animate-spin" />}{labelOk}
        </button>
      </div>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// UI BUILDING BLOCKS
// ════════════════════════════════════════════════════════════════════════════════
function ModalShell({ children, onClose, ancho = "max-w-lg" }: {
  children: React.ReactNode; onClose: () => void; ancho?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${ancho} bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden`}>{children}</div>
    </div>
  );
}

function BtnCerrar({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-gray-600 hover:text-gray-400 transition p-1"><X size={18} /></button>;
}

function SeccionLabel({ texto }: { texto: string }) {
  return <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 pt-1">{texto}</p>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-gray-400 mb-1.5">{children}</label>;
}

function Input({ value, onChange, type = "text", placeholder, required, min, max }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
  required?: boolean; min?: number; max?: number;
}) {
  return (
    <input type={type} required={required} min={min} max={max} value={value}
      onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition" />
  );
}

function Select({ value, onChange, opciones }: {
  value: string; onChange: (v: string) => void; opciones: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm appearance-none pr-9 focus:outline-none focus:border-emerald-500/50 transition">
        {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-red-400 text-xs">{msg}</p>
    </div>
  );
}

function FooterModal({ onClose, loading, labelOk }: {
  onClose: () => void; loading: boolean; labelOk: string;
}) {
  return (
    <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
      <button type="button" onClick={onClose}
        className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 hover:text-gray-300 transition">
        Cancelar
      </button>
      <button type="submit" disabled={loading}
        className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-white text-sm font-semibold transition flex items-center justify-center gap-2">
        {loading && <Loader2 size={14} className="animate-spin" />}{labelOk}
      </button>
    </div>
  );
}

function MiniKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/30 rounded-xl px-3 py-3">
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{label}</span></div>
      <p className="text-white font-bold text-sm">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string; }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-sm font-medium ${valueClass ?? "text-gray-300"}`}>{value}</span>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, bg }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; bg: string;
}) {
  return (
    <div className={`border rounded-2xl px-5 py-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500 font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL DE ALERTAS
// ════════════════════════════════════════════════════════════════════════════════
const ALERTA_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string; dot: string }> = {
  PAGO_VENCIDO:     { label: "Pago vencido",     icon: <CreditCard size={13} />, cls: "text-red-400 bg-red-500/10 border-red-500/20",     dot: "bg-red-400"    },
  TRIAL_POR_VENCER: { label: "Trial por vencer", icon: <Clock size={13} />,      cls: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400"  },
  INACTIVO:         { label: "Sin actividad",    icon: <AlertCircle size={13} />, cls: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400"  },
  INVITE_VENCIDO:   { label: "Invite vencido",   icon: <Mail size={13} />,        cls: "text-blue-400 bg-blue-500/10 border-blue-500/20",    dot: "bg-blue-400"   },
};

function AlertasPanel({ alertas, onVerLocal }: { alertas: Alerta[]; onVerLocal: (id: number) => void }) {
  const [expandido, setExpandido] = useState(true);
  if (alertas.length === 0) return null;
  const altas = alertas.filter((a) => a.severidad === "alta");
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle size={16} className={altas.length > 0 ? "text-red-400" : "text-amber-400"} />
          <span className="text-white font-semibold text-sm">Alertas activas</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${altas.length > 0 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
            {alertas.length}
          </span>
          {altas.length > 0 && (
            <span className="text-xs text-red-400">{altas.length} urgente{altas.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${expandido ? "rotate-180" : ""}`} />
      </button>
      {expandido && (
        <div className="border-t border-gray-800 divide-y divide-gray-800">
          {alertas.map((alerta, i) => {
            const cfg = ALERTA_CONFIG[alerta.tipo];
            return (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border mr-2 ${cfg.cls}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                    <span className="text-white text-sm font-medium">{alerta.localNombre}</span>
                    <span className="text-gray-500 text-xs ml-2">— {alerta.detalle}</span>
                  </div>
                </div>
                <button
                  onClick={() => onVerLocal(alerta.localId)}
                  className="text-xs text-gray-500 hover:text-white transition px-2 py-1 rounded-lg hover:bg-gray-700 flex-shrink-0"
                >
                  Ver local →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════
export default function SuperAdminPage() {
  const router = useRouter();

  const [data, setData]                     = useState<{ locales: LocalRow[] } | null>(null);
  const [cargando, setCargando]             = useState(true);
  const [busqueda, setBusqueda]             = useState("");
  const [filtroEstado, setFiltroEstado]     = useState("TODOS");
  const [alertas, setAlertas]               = useState<Alerta[]>([]);

  const [modalNuevo, setModalNuevo]         = useState(false);
  const [modalEditar, setModalEditar]       = useState<LocalRow | null>(null);
  const [modalDetalle, setModalDetalle]     = useState<LocalRow | null>(null);
  const [modalInvite, setModalInvite]       = useState<{ local: LocalRow; url: string } | null>(null);
  const [modalConfirm, setModalConfirm]     = useState<{
    local: LocalRow; tipo: "eliminar" | "suspender" | "activar";
  } | null>(null);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchLocales = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/locales");
      const d   = await res.json();
      setData(d);
    } catch {}
    setCargando(false);
  }, []);

  const fetchAlertas = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/alertas");
      const d   = await res.json();
      if (res.ok) setAlertas(d.alertas ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchLocales(); }, [fetchLocales]);
  useEffect(() => { fetchAlertas(); }, [fetchAlertas]);

  function updateLocal(id: number, patch: Partial<LocalRow>) {
    setData((prev) => prev
      ? { ...prev, locales: prev.locales.map((l) => l.id === id ? { ...l, ...patch } : l) }
      : prev
    );
  }

  // ── Reenviar invite ──────────────────────────────────────────────────
  async function handleReenviarInvite(local: LocalRow) {
    const toastId = toast.loading("Regenerando invitación…");
    try {
      const res  = await fetch(`/api/superadmin/locales/${local.id}/reenviar-invite`, { method: "POST" });
      const data = await res.json();
      toast.dismiss(toastId);
      if (!res.ok) { toast.error(data.error ?? "Error reenviando"); return; }
      setModalInvite({ local, url: data.inviteUrl });
    } catch {
      toast.error("Error de conexión", { id: toastId });
    }
  }

  // ── Cambiar estado ───────────────────────────────────────────────────
  function handleCambiarEstado(local: LocalRow, nuevoEstado: string) {
    if (nuevoEstado === "SUSPENDIDO") { setModalConfirm({ local, tipo: "suspender" }); return; }
    setModalConfirm({ local, tipo: "activar" });
  }

  async function ejecutarCambioEstado() {
    if (!modalConfirm) return;
    setLoadingConfirm(true);
    const { local, tipo } = modalConfirm;

    try {
      if (tipo === "eliminar") {
        const res = await fetch(`/api/superadmin/locales/${local.id}`, { method: "DELETE" });
        if (res.ok) { updateLocal(local.id, { estado: "BAJA" }); toast.success("Local dado de baja"); }
        else { const d = await res.json(); toast.error(d.error ?? "Error"); }
      } else {
        const estado = tipo === "suspender" ? "SUSPENDIDO" : "ACTIVO";
        const res = await fetch(`/api/superadmin/locales/${local.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado }),
        });
        if (res.ok) { updateLocal(local.id, { estado }); toast.success(tipo === "suspender" ? "Local suspendido" : "Local activado"); }
        else { const d = await res.json(); toast.error(d.error ?? "Error"); }
      }
    } catch { toast.error("Error de conexión"); }

    setLoadingConfirm(false);
    setModalConfirm(null);
  }

  // ── KPIs ─────────────────────────────────────────────────────────────
  const locales          = data?.locales ?? [];
  const totalActivos     = locales.filter((l) => l.estado === "ACTIVO").length;
  const totalSuspendidos = locales.filter((l) => l.estado === "SUSPENDIDO").length;
  const ventasMes        = locales.reduce((s, l) => s + l.mes.ventaTotal, 0);
  const sesionesMes      = locales.reduce((s, l) => s + l.mes.sesiones, 0);

  // ── Filtrado ─────────────────────────────────────────────────────────
  const localesFiltrados = locales.filter((l) => {
    const q = busqueda.toLowerCase();
    const matchBusqueda = l.nombre.toLowerCase().includes(q) ||
      l.admin?.email.toLowerCase().includes(q) ||
      l.admin?.nombre.toLowerCase().includes(q);
    return matchBusqueda && (filtroEstado === "TODOS" || l.estado === filtroEstado);
  });

  const conteo: Record<string, number> = { TODOS: locales.length };
  for (const l of locales) conteo[l.estado] = (conteo[l.estado] ?? 0) + 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ═══ HEADER CON LOGOUT ═══ */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BadgeCheck size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">Karta</h1>
              <p className="text-gray-600 text-xs mt-0.5">Super Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => { fetchLocales(); fetchAlertas(); }}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition" title="Recargar">
              <RefreshCcw size={16} />
            </button>
            <button onClick={() => setModalNuevo(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
              <Plus size={16} /> Nuevo local
            </button>

            {/* ─── Botón Logout ─── */}
            <a href="/api/logout"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition text-sm"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<Store size={18} className="text-emerald-400" />}
            label="Locales activos" value={totalActivos}
            sub={`de ${locales.length} totales`} bg="bg-emerald-500/5 border-emerald-500/10" />
          <KpiCard icon={<DollarSign size={18} className="text-violet-400" />}
            label="Ventas este mes" value={fmt(ventasMes)}
            sub={`${sesionesMes} sesiones`} bg="bg-violet-500/5 border-violet-500/10" />
          <KpiCard icon={<TrendingUp size={18} className="text-blue-400" />}
            label="Ticket promedio"
            value={sesionesMes > 0 ? fmt(Math.round(ventasMes / sesionesMes)) : "—"}
            sub="Todos los locales" bg="bg-blue-500/5 border-blue-500/10" />
          <KpiCard icon={<ShieldAlert size={18} className="text-red-400" />}
            label="Suspendidos" value={totalSuspendidos}
            bg="bg-red-500/5 border-red-500/10" />
        </div>

        {/* Alertas */}
        <AlertasPanel alertas={alertas} onVerLocal={(id) => router.push(`/superadmin/locales/${id}`)} />

        {/* Tabla */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, email o admin…"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition" />
            </div>
            <div className="flex gap-1.5">
              {["TODOS", "ACTIVO", "SUSPENDIDO", "BAJA"].map((e) => (
                <button key={e} onClick={() => setFiltroEstado(e)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    filtroEstado === e ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                  }`}>
                  {e === "TODOS" ? "Todos" : ESTADO_BADGE[e]?.label ?? e}
                  {(conteo[e] ?? 0) > 0 && (
                    <span className={`text-[10px] ${filtroEstado === e ? "text-emerald-200" : "text-gray-600"}`}>
                      {conteo[e]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {cargando ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-gray-600 text-sm">Cargando locales…</p>
            </div>
          ) : localesFiltrados.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2">
              <Store size={28} className="text-gray-700" />
              <p className="text-gray-600 text-sm">No hay locales que coincidan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Local", "Estado", "Admin", "Mesas", "Ventas mes", "Sesiones", "Ticket", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {localesFiltrados.map((local) => {
                    const eb = ESTADO_BADGE[local.estado] ?? ESTADO_BADGE.BAJA;
                    const pendiente = local.admin && !local.admin.activo;

                    return (
                      <tr key={local.id} className="hover:bg-gray-800/30 transition group">
                        <td className="px-5 py-3.5">
                          <button onClick={() => setModalDetalle(local)} className="text-left hover:opacity-80 transition">
                            <p className="font-semibold text-white group-hover:text-emerald-400 transition">{local.nombre}</p>
                            <p className="text-gray-600 text-xs mt-0.5">Alta: {fechaCorta(local.fechaAlta)}</p>
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${eb.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${eb.dotCls}`} />{eb.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {local.admin ? (
                            <div>
                              <p className="text-gray-300 text-sm">{local.admin.nombre}</p>
                              <p className="text-gray-600 text-xs">{local.admin.email}</p>
                              {pendiente && (
                                <button onClick={() => handleReenviarInvite(local)}
                                  className="inline-flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 mt-0.5 transition">
                                  <MessageCircle size={10} /> Pendiente — reenviar
                                </button>
                              )}
                            </div>
                          ) : <span className="text-gray-700 text-xs">Sin admin</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400">{local.mesas}</td>
                        <td className="px-5 py-3.5">
                          <p className={`font-medium ${local.mes.ventaTotal > 0 ? "text-white" : "text-gray-700"}`}>
                            {fmt(local.mes.ventaTotal)}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400">{local.mes.sesiones}</td>
                        <td className="px-5 py-3.5 text-gray-400">
                          {local.mes.ticketPromedio > 0 ? fmt(local.mes.ticketPromedio) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <AccionesDropdown local={local}
                            onEditar={() => setModalEditar(local)}
                            onReenviarInvite={() => handleReenviarInvite(local)}
                            onCambiarEstado={(e) => handleCambiarEstado(local, e)}
                            onEliminar={() => setModalConfirm({ local, tipo: "eliminar" })}
                            onVerDetalle={() => setModalDetalle(local)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ═══ MODALES ═══ */}
      {modalNuevo && (
        <ModalNuevoLocal
          onClose={() => setModalNuevo(false)}
          onCreated={(l) => {
            setData((p) => p ? { ...p, locales: [l, ...p.locales] } : { locales: [l] });
            setModalNuevo(false);
          }}
        />
      )}
      {modalEditar && (
        <ModalEditarLocal local={modalEditar}
          onClose={() => setModalEditar(null)}
          onUpdated={(u) => {
            updateLocal(u.id, u);
            setModalEditar(null);
            if (modalDetalle?.id === u.id) setModalDetalle((p) => p ? { ...p, ...u } : null);
          }}
        />
      )}
      {modalDetalle && (
        <ModalDetalle local={modalDetalle}
          onClose={() => setModalDetalle(null)}
          onEditar={() => { setModalEditar(modalDetalle); setModalDetalle(null); }}
          onReenviarInvite={() => handleReenviarInvite(modalDetalle)}
        />
      )}
      {modalInvite && (
        <ModalInvite local={modalInvite.local} inviteUrl={modalInvite.url}
          onClose={() => setModalInvite(null)}
        />
      )}
      {modalConfirm && (
        <ModalConfirmar
          titulo={
            modalConfirm.tipo === "eliminar" ? `¿Dar de baja "${modalConfirm.local.nombre}"?`
            : modalConfirm.tipo === "suspender" ? `¿Suspender "${modalConfirm.local.nombre}"?`
            : `¿Activar "${modalConfirm.local.nombre}"?`
          }
          mensaje={
            modalConfirm.tipo === "eliminar" ? "Se desactivarán todos los usuarios. Los datos se conservan pero el local no podrá operar."
            : modalConfirm.tipo === "suspender" ? "El admin será desactivado y los QR mostrarán 'Servicio interrumpido'."
            : "Se reactivará el acceso y el local podrá operar normalmente."
          }
          labelOk={modalConfirm.tipo === "eliminar" ? "Dar de baja" : modalConfirm.tipo === "suspender" ? "Suspender" : "Activar"}
          colorOk={modalConfirm.tipo === "activar" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"}
          loading={loadingConfirm}
          onClose={() => { setModalConfirm(null); setLoadingConfirm(false); }}
          onConfirm={ejecutarCambioEstado}
        />
      )}
    </div>
  );
}