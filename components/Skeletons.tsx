// components/Skeletons.tsx
import { Skeleton } from "@/components/ui/Skeleton";

// 1. SKELETON PARA EL MENÚ (Tarjeta de Producto)
export function SkeletonProducto() {
  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-row gap-3 h-[120px]">
      {/* Foto Cuadrada */}
      <Skeleton className="w-[100px] h-full rounded-xl flex-shrink-0" />
      
      {/* Contenido */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <Skeleton className="h-4 w-3/4 mb-2" /> {/* Título */}
          <Skeleton className="h-3 w-full mb-1" /> {/* Desc 1 */}
          <Skeleton className="h-3 w-1/2" />       {/* Desc 2 */}
        </div>
        <div className="flex justify-between items-end">
          <Skeleton className="h-6 w-16" /> {/* Precio */}
          <Skeleton className="h-8 w-20 rounded-lg" /> {/* Botón sumar */}
        </div>
      </div>
    </div>
  );
}

// 2. SKELETON PARA TABLAS (Filas del Historial/Admin)
export function SkeletonFilaTabla() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-100">
      <Skeleton className="h-4 w-24" /> {/* Fecha */}
      <Skeleton className="h-4 w-32 flex-1" /> {/* Datos Centro */}
      <Skeleton className="h-6 w-16" /> {/* Total/Estado */}
      <Skeleton className="h-8 w-8 rounded-full" /> {/* Botón Acción */}
    </div>
  );
}

// 3. SKELETON PARA KPI (Tarjetas de números grandes)
export function SkeletonKPI() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[140px] flex flex-col justify-between">
      <Skeleton className="h-4 w-32" /> {/* Título chiquito */}
      <Skeleton className="h-10 w-40" /> {/* Número Gigante */}
    </div>
  );
}

// 4. SKELETON PARA CATEGORÍAS (Píldoras del menú)
export function SkeletonCategoria() {
  return <Skeleton className="h-8 w-24 rounded-full flex-shrink-0" />;
}

// 5. SKELETON DASHBOARD COMPLETO (Para la home del admin)
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in">
       {/* KPIs */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
       </div>
       {/* Tabla */}
       <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="space-y-4">
             {[1,2,3,4,5].map(i => <SkeletonFilaTabla key={i} />)}
          </div>
       </div>
    </div>
  );
}