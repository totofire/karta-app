"use client";
import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Plus, Trash2, ToggleLeft, ToggleRight, Tag, Clock, Calendar, Loader2, X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tipo = "PORCENTAJE" | "2X1" | "PRECIO_ESPECIAL" | "DESCUENTO_GLOBAL";

interface ReglaDescuento {
  id: number;
  nombre: string;
  tipo: Tipo;
  valor: number;
  categoriaId: number | null;
  productoId: number | null;
  diasSemana: string | null;
  horaDesde: string | null;
  horaHasta: string | null;
  activo: boolean;
}

interface Categoria { id: number; nombre: string }
interface Producto  { id: number; nombre: string; categoriaId: number }

const DIAS = [
  { value: "1", label: "Lun" },
  { value: "2", label: "Mar" },
  { value: "3", label: "Mié" },
  { value: "4", label: "Jue" },
  { value: "5", label: "Vie" },
  { value: "6", label: "Sáb" },
  { value: "7", label: "Dom" },
];

const TIPO_LABELS: Record<Tipo, string> = {
  PORCENTAJE:       "% Descuento",
  "2X1":            "2×1",
  PRECIO_ESPECIAL:  "Precio especial",
  DESCUENTO_GLOBAL: "Descuento fijo ($)",
};

const TIPO_COLORS: Record<Tipo, string> = {
  PORCENTAJE:       "bg-blue-100 text-blue-700",
  "2X1":            "bg-purple-100 text-purple-700",
  PRECIO_ESPECIAL:  "bg-orange-100 text-orange-700",
  DESCUENTO_GLOBAL: "bg-green-100 text-green-700",
};

function describirRegla(r: ReglaDescuento, categorias: Categoria[], productos: Producto[]): string {
  const partes: string[] = [];

  if (r.tipo === "PORCENTAJE")       partes.push(`${r.valor}% off`);
  if (r.tipo === "DESCUENTO_GLOBAL") partes.push(`$${r.valor} off`);
  if (r.tipo === "PRECIO_ESPECIAL")  partes.push(`Precio: $${r.valor}`);
  if (r.tipo === "2X1")              partes.push("2×1");

  if (r.productoId) {
    const p = productos.find((x) => x.id === r.productoId);
    if (p) partes.push(`en ${p.nombre}`);
  } else if (r.categoriaId) {
    const c = categorias.find((x) => x.id === r.categoriaId);
    if (c) partes.push(`en ${c.nombre}`);
  } else {
    partes.push("sobre total");
  }

  if (r.diasSemana) {
    const dias = r.diasSemana.split(",").map((d) => DIAS.find((x) => x.value === d)?.label).filter(Boolean);
    partes.push(dias.join("/"));
  }
  if (r.horaDesde && r.horaHasta) partes.push(`${r.horaDesde}–${r.horaHasta}hs`);

  return partes.join(" · ");
}

const FORM_VACIO = {
  nombre: "",
  tipo: "PORCENTAJE" as Tipo,
  valor: 0,
  categoriaId: "" as string | number,
  productoId:  "" as string | number,
  diasSemana:  [] as string[],
  horaDesde:   "",
  horaHasta:   "",
};

export default function DescuentosPage() {
  const { data: reglas = [],     mutate } = useSWR<ReglaDescuento[]>("/api/admin/descuentos", fetcher);
  const { data: categorias = [] }         = useSWR<Categoria[]>("/api/admin/categorias", fetcher);
  const { data: productosRaw = [] }       = useSWR<{ categorias: { productos: Producto[] }[] }>(
    "/api/admin/productos", fetcher
  );

  // Aplanar productos
  const productos: Producto[] = Array.isArray(productosRaw)
    ? productosRaw.flatMap((c: any) => c.productos ?? [])
    : [];

  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando]     = useState(false);
  const [eliminando, setEliminando]   = useState<number | null>(null);
  const [toggling, setToggling]       = useState<number | null>(null);
  const [form, setForm]               = useState(FORM_VACIO);

  const set = (campo: string, valor: unknown) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const toggleDia = (dia: string) => {
    setForm((prev) => {
      const dias = prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia];
      return { ...prev, diasSemana: dias };
    });
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { toast.error("Ingresá un nombre"); return; }
    setGuardando(true);
    try {
      const body = {
        nombre:      form.nombre,
        tipo:        form.tipo,
        valor:       Number(form.valor),
        categoriaId: form.categoriaId !== "" ? Number(form.categoriaId) : null,
        productoId:  form.productoId  !== "" ? Number(form.productoId)  : null,
        diasSemana:  form.diasSemana.length > 0 ? form.diasSemana.join(",") : null,
        horaDesde:   form.horaDesde || null,
        horaHasta:   form.horaHasta || null,
      };
      const res = await fetch("/api/admin/descuentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Error"); return; }
      toast.success("Regla creada");
      setForm(FORM_VACIO);
      setMostrarForm(false);
      mutate();
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (regla: ReglaDescuento) => {
    setToggling(regla.id);
    try {
      await fetch(`/api/admin/descuentos/${regla.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !regla.activo }),
      });
      mutate();
    } finally {
      setToggling(null);
    }
  };

  const eliminar = async (id: number) => {
    setEliminando(id);
    try {
      await fetch(`/api/admin/descuentos/${id}`, { method: "DELETE" });
      toast.success("Regla eliminada");
      mutate();
    } finally {
      setEliminando(null);
    }
  };

  const necesitaValor = form.tipo !== "2X1";
  const labelValor =
    form.tipo === "PORCENTAJE"       ? "Porcentaje (%)" :
    form.tipo === "DESCUENTO_GLOBAL" ? "Monto fijo ($)" :
    form.tipo === "PRECIO_ESPECIAL"  ? "Precio especial ($)" : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Descuentos y Promociones</h1>
          <p className="text-slate-500 text-sm mt-1">
            Reglas automáticas que se aplican según día, horario y producto.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
        >
          {mostrarForm ? <X size={16} /> : <Plus size={16} />}
          {mostrarForm ? "Cancelar" : "Nueva regla"}
        </button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <h2 className="font-black text-slate-800 text-base">Nueva regla de descuento</h2>

          {/* Nombre */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Nombre
            </label>
            <input
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: 2x1 cervezas jueves"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
              Tipo de descuento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIPO_LABELS) as Tipo[]).map((t) => (
                <button
                  key={t}
                  onClick={() => set("tipo", t)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-bold text-left transition-all
                    ${form.tipo === t
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                >
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          {necesitaValor && (
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                {labelValor}
              </label>
              <input
                type="number"
                min={0}
                value={form.valor || ""}
                onChange={(e) => set("valor", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                Categoría (opcional)
              </label>
              <select
                value={form.categoriaId}
                onChange={(e) => { set("categoriaId", e.target.value); set("productoId", ""); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                Producto (opcional)
              </label>
              <select
                value={form.productoId}
                onChange={(e) => set("productoId", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Todos</option>
                {(form.categoriaId !== ""
                  ? productos.filter((p) => p.categoriaId === Number(form.categoriaId))
                  : productos
                ).map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Días */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
              <Calendar size={11} className="inline mr-1" />
              Días (vacío = todos)
            </label>
            <div className="flex gap-2 flex-wrap">
              {DIAS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => toggleDia(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all
                    ${form.diasSemana.includes(d.value)
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horario */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
              <Clock size={11} className="inline mr-1" />
              Horario (vacío = todo el día)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={form.horaDesde}
                onChange={(e) => set("horaDesde", e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-slate-400 font-bold text-sm">a</span>
              <input
                type="time"
                value={form.horaHasta}
                onChange={(e) => set("horaHasta", e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Guardar regla
          </button>
        </div>
      )}

      {/* Lista de reglas */}
      {reglas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">Sin reglas de descuento</p>
          <p className="text-sm mt-1">Creá una regla para empezar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reglas.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border-2 p-4 flex items-start justify-between gap-4 transition-all
                ${r.activo ? "border-slate-100" : "border-slate-100 opacity-50"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${TIPO_COLORS[r.tipo]}`}>
                    {TIPO_LABELS[r.tipo]}
                  </span>
                  {!r.activo && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase">
                      Inactiva
                    </span>
                  )}
                </div>
                <p className="font-black text-slate-800 text-sm">{r.nombre}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                  {describirRegla(r, categorias, productos)}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActivo(r)}
                  disabled={toggling === r.id}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors active:scale-95 text-slate-500"
                  title={r.activo ? "Desactivar" : "Activar"}
                >
                  {toggling === r.id
                    ? <Loader2 size={18} className="animate-spin" />
                    : r.activo
                      ? <ToggleRight size={20} className="text-green-600" />
                      : <ToggleLeft size={20} />
                  }
                </button>
                <button
                  onClick={() => eliminar(r.id)}
                  disabled={eliminando === r.id}
                  className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors active:scale-95"
                >
                  {eliminando === r.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Trash2 size={16} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
