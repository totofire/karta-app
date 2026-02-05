"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Toaster } from "react-hot-toast";
import NotificationsManager from "@/components/NotificationsManager";
import {
  LayoutDashboard,
  ChefHat,
  QrCode,
  UtensilsCrossed,
  Armchair,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Tags,
  GlassWater,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { name: "Panel General", href: "/admin", icon: LayoutDashboard },
    { name: "Cocina en Vivo", href: "/admin/cocina", icon: ChefHat },
    { name: "Barra / Bebidas", href: "/admin/barra", icon: GlassWater },
    { name: "Mesas y Zonas", href: "/admin/mesas", icon: Armchair },
    { name: "Categorías", href: "/admin/categorias", icon: Tags },
    {
      name: "Productos y Carta",
      href: "/admin/productos",
      icon: UtensilsCrossed,
    },
    { name: "Códigos QR", href: "/admin/qr", icon: QrCode },
    { name: "Historial Ventas", href: "/admin/historial", icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex transition-all duration-300">
      <Toaster />
<NotificationsManager />
      
      {/* SIDEBAR (Oculto al imprimir) */}
      <aside
        className={`
          bg-white border-r border-gray-200 hidden md:flex flex-col fixed inset-y-0 z-50 transition-all duration-300 ease-in-out print:hidden
          ${isSidebarOpen ? "w-64" : "w-20"} 
        `}
      >
        {/* HEADER DEL SIDEBAR */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 relative bg-white z-20">
          {/* Abierto: Icono + Marca */}
          <div
            className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isSidebarOpen ? "opacity-100 w-auto" : "opacity-0 w-0"}`}
          >
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src="/logo-karta.png"
                alt="Icono"
                fill
                className="object-contain"
                sizes="32px"
              />
            </div>
            <div className="relative w-24 h-8">
              <Image
                src="/logo2.png"
                alt="KARTA"
                fill
                className="object-contain object-left"
                priority
                sizes="100px"
              />
            </div>
          </div>

          {/* Cerrado: Solo Icono centrado */}
          {!isSidebarOpen && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo-karta.png"
                  alt="K"
                  fill
                  className="object-contain"
                  sizes="40px"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botón Flotante para Colapsar */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 z-50 hidden md:flex"
        >
          {isSidebarOpen ? (
            <ChevronLeft size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        {/* --- NAVEGACIÓN --- */}
        <nav className="flex-1 p-3 space-y-1 mt-4 overflow-visible">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center rounded-xl transition-all font-bold text-sm h-12 relative group
                  ${isSidebarOpen ? "px-4 gap-3" : "justify-center px-0"}
                  ${
                    isActive
                      ? "bg-red-50 text-red-600 shadow-sm"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="flex-shrink-0 relative z-10"
                />

                {/* Texto del link */}
                <span
                  className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 w-0 absolute"}`}
                >
                  {item.name}
                </span>

                {/* TOOLTIP FLOTANTE (Solo visible cerrado) */}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-4 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[100] whitespace-nowrap shadow-xl">
                    {item.name}
                    <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-gray-100 bg-white z-20">
          <button
            onClick={() => (window.location.href = "/api/logout")}
            className={`
               flex items-center rounded-xl transition-colors font-bold text-sm h-12 w-full group relative
               text-gray-400 hover:text-red-600 hover:bg-red-50
               ${isSidebarOpen ? "px-4 gap-3" : "justify-center px-0"}
             `}
          >
            <LogOut size={20} className="flex-shrink-0 relative z-10" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"}`}
            >
              Salir
            </span>

            {/* Tooltip para Salir */}
            {!isSidebarOpen && (
              <div className="absolute left-full ml-4 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[100] whitespace-nowrap shadow-xl">
                Cerrar Sesión
                <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main
        className={`
          flex-1 p-4 md:p-8 transition-all duration-300 ease-in-out print:ml-0 print:p-0 pb-24 md:pb-8
          ${isSidebarOpen ? "md:ml-64" : "md:ml-20"} 
        `}
      >
        {children}
      </main>

      {/* ==========================================
          NAVEGACIÓN MÓVIL CON SCROLL HORIZONTAL
          ========================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50 print:hidden">
        
        {/* GRADIENTE IZQUIERDO - Indica más contenido a la izquierda */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
        
        {/* GRADIENTE DERECHO - Indica más contenido a la derecha */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
        
        {/* CONTENEDOR CON SCROLL HORIZONTAL */}
        <div className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex justify-start min-w-max px-2 py-2 gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[70px]
                    ${isActive 
                      ? "bg-red-600 text-white shadow-lg shadow-red-200" 
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:scale-95"
                    }
                  `}
                >
                  <Icon size={20} strokeWidth={2.5} />
                  <span className="text-[9px] font-bold uppercase tracking-wide whitespace-nowrap">
                    {item.name.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* INDICADORES DE SCROLL (puntitos) */}
        <div className="flex justify-center gap-1 pb-2 pt-1">
          {[...Array(Math.ceil(menuItems.length / 4))].map((_, idx) => (
            <div 
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === 0 ? "w-4 bg-red-600" : "w-1 bg-gray-200"
              }`}
            ></div>
          ))}
        </div>
      </nav>

    </div>
  );
}