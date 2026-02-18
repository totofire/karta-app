"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { ArrowLeft, TrendingUp, TrendingDown, Circle, Clock, DollarSign } from "lucide-react";
import Link from "next/link";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Componente de número animado
function AnimatedNumber({ value, prefix = "$", duration = 1000 }: any) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const startValue = displayValue;
    const difference = value - startValue;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setDisplayValue(Math.floor(startValue + difference * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span className="tabular-nums">{prefix}{displayValue.toLocaleString('es-AR')}</span>;
}

export default function VentasHoyPage() {
  const { data, isLoading } = useSWR("/api/admin/metricas/ventas-hoy", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-medium tracking-wide">Cargando datos en vivo...</p>
        </div>
      </div>
    );
  }

  const { resumen, curva, picos, topMesas } = data;
  const esPositivo = resumen.porcentaje >= 0;
  const hayActividad = resumen.activo > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      
      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Análisis de Ventas</h1>
              <p className="text-sm text-slate-500 font-medium">
                Datos en tiempo real • {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          {hayActividad && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full">
              <Circle size={8} className="text-emerald-600 fill-emerald-600 animate-pulse" />
              <span className="text-sm font-bold text-emerald-700 tracking-wide">EN VIVO</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        
        {/* HERO METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mb-3">Facturación del Día</p>
                  <div className="text-6xl font-black tracking-tighter mb-2">
                    <AnimatedNumber value={resumen.cerrado} />
                  </div>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 backdrop-blur-xl border ${esPositivo ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' : 'bg-red-500/20 border-red-400/30 text-red-300'}`}>
                  {esPositivo ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  {Math.abs(resumen.porcentaje)}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Vs Ayer</p>
                  <p className="text-lg font-bold text-white">${resumen.ayer.toLocaleString('es-AR')}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Sesiones</p>
                  <p className="text-lg font-bold text-white">{resumen.sesiones}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Promedio</p>
                  <p className="text-lg font-bold text-white">${resumen.ticketPromedio.toLocaleString('es-AR')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {hayActividad && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">En Proceso</p>
                  <div className="p-2 bg-amber-50 rounded-lg"><Clock size={18} className="text-amber-600" /></div>
                </div>
                <p className="text-3xl font-black text-slate-900 mb-1">${resumen.activo.toLocaleString('es-AR')}</p>
                <p className="text-sm text-slate-500">Mesas abiertas sin cobrar</p>
              </div>
            )}
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-emerald-700 font-bold uppercase tracking-wider text-xs">Proyección Total</p>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-emerald-900 mb-1">${resumen.proyectado.toLocaleString('es-AR')}</p>
              <p className="text-sm text-emerald-700">Cerrado + activo</p>
            </div>
          </div>
        </div>

        {/* CURVA DE VENTAS */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-slate-900">Evolución del Día</h3>
              <p className="text-sm text-slate-500 mt-1">Pico: {picos.horaPico} con ${picos.ventaPico.toLocaleString('es-AR')}</p>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curva} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 13, fill: '#94a3b8', fontWeight: 600}} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 13, fill: '#94a3b8', fontWeight: 600}} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={60} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                  // ⬇️ AQUÍ ESTÁ LA CORRECCIÓN: USAMOS 'any' PARA EVITAR EL ERROR DE TYPESCRIPT
                  formatter={(value: any, name: any) => [
                    `$${Number(value).toLocaleString('es-AR')}`, 
                    name === 'ventas' ? 'Facturado' : name
                  ]}
                  labelStyle={{color: '#64748b', fontWeight: 700, marginBottom: '4px'}}
                />
                <Area type="monotone" dataKey="ventas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP MESAS */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Mesas Más Activas</h3>
          <div className="space-y-3">
            {topMesas.map((mesa: any, i: number) => {
              const porcentajeMax = topMesas[0].total > 0 ? (mesa.total / topMesas[0].total) * 100 : 0;
              return (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className="font-bold text-slate-700 text-sm">{mesa.nombre}</span>
                    <span className="text-lg font-black text-slate-900">${mesa.total.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${porcentajeMax}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}