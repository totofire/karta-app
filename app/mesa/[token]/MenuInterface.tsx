"use client";
import { useState } from "react";
import Image from "next/image";
import { useLoader } from "@/context/LoaderContext";
export default function MenuInterface({ mesa, categorias }: any) {
  // LÓGICA DE INTERFAZ (Estados)
  const [carrito, setCarrito] = useState<any>({});
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { showLoader, hideLoader } = useLoader();
  // Estado solo para resaltar el botón activo visualmente (opcional)
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]?.id || 0);

  // --- NUEVA LÓGICA DE SCROLL ---
  const scrollearACategoria = (catId: number) => {
    setCategoriaActiva(catId);
    const elemento = document.getElementById(`cat-${catId}`);
    
    if (elemento) {
      // Calculamos el offset para que el Header pegajoso no tape el título
      const headerOffset = 130; // Ajuste según la altura de tu header nuevo
      const elementPosition = elemento.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Lógica para sumar/restar productos (Igual que antes)
  const actualizarCantidad = (productoId: number, delta: number) => {
    setCarrito((prev: any) => {
      const actual = prev[productoId] || 0;
      const nuevo = Math.max(0, actual + delta);
      if (nuevo === 0) {
        const { [productoId]: _, ...resto } = prev; 
        return resto;
      }
      return { ...prev, [productoId]: nuevo };
    });
  };

  // Lógica de Totales
  const totalItems = Object.values(carrito).reduce((a: number, b: any) => a + Number(b), 0);
  
  const precioTotal = categorias.flatMap((c: any) => c.productos).reduce((total: number, p: any) => {
    return total + (p.precio * (carrito[p.id] || 0));
  }, 0);

  const confirmarPedido = async () => {
    if (!nombre.trim()) return alert("¡Para! Decinos tu nombre para llamarte.");
    
    // 1. Mostramos el loader de Karta antes de empezar
    showLoader(); 
    setEnviando(true);

    const items = Object.entries(carrito).map(([id, cantidad]) => ({
      productoId: Number(id),
      cantidad
    }));

    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mesaToken: mesa.qr_token, 
          nombreCliente: nombre, 
          productos: items 
        }),
      });

      if (res.ok) {
        alert("¡Pedido enviado! 🍔 En un toque te llamamos.");
        setCarrito({});
        setNombre("");
      } else {
        alert("Hubo un error al pedir. Llamá al mozo.");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("Error de conexión con el servidor.");
    } finally {
      // 2. Ocultamos el loader al terminar la operación
      hideLoader();
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* HEADER COMPACTO */}
      <header className="bg-gradient-to-br from-red-600 to-red-700 text-white shadow-xl sticky top-0 z-20">
        
        {/* SECCIÓN SUPERIOR */}
        <div className="px-3 py-2 flex items-center justify-between border-b border-white/10 h-[70px]"> 
          <div className="flex items-center gap-2 h-full">
            <div className="relative w-24 h-full min-h-[50px] drop-shadow-md">
              <Image 
                src="/karta-logo.png" 
                alt="Logo" 
                fill
                className="object-contain object-left" 
                priority
              />
            </div>
          </div>
          <div className="flex flex-col items-end justify-center leading-none">
            <span className="text-[9px] font-semibold text-red-200 uppercase tracking-widest mb-0.5">Mesa</span>
            <div className="bg-white/95 text-red-600 px-3 py-1 rounded-md font-black text-sm shadow-sm">
              {mesa.nombre}
            </div>
          </div>
        </div>

        {/* CATEGORÍAS (Barra de Navegación) */}
        <div className="flex gap-2 overflow-x-auto py-2 px-3 scrollbar-hide bg-red-700/50 backdrop-blur-sm">
          {categorias.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => scrollearACategoria(cat.id)} // <--- AHORA HACE SCROLL
              className={`
                px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                ${categoriaActiva === cat.id 
                  ? 'bg-white text-red-600 border-white shadow-sm' 
                  : 'bg-black/10 text-white border-transparent hover:bg-black/20'}
              `}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </header>

      {/* CARTA - TODOS LOS PRODUCTOS */}
      <main className="p-4 space-y-8">
        {categorias.map((cat: any) => (
            // IMPORTANTE: Quitamos el .filter() y agregamos el ID para el scroll
            <section 
              key={cat.id} 
              id={`cat-${cat.id}`} // <--- ESTO ES EL ANCLA
              className="scroll-mt-32" // Ayuda nativa de CSS para el scroll
            >
              <div className="flex items-center gap-2 mb-4 sticky top-[120px] bg-gray-50/95 backdrop-blur-sm p-2 z-10 -mx-2 rounded-lg">
                <div className="h-6 w-1 bg-red-600 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800">{cat.nombre}</h2>
              </div>
              
              <div className="grid gap-3">
                {cat.productos.map((prod: any) => (
                  <div key={prod.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-row justify-between items-center gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                    
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex-1 pl-1">
                      <h3 className="font-bold text-base text-gray-900 leading-tight">{prod.nombre}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prod.descripcion}</p>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-lg font-black text-red-600">${prod.precio}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                      <button 
                        onClick={() => actualizarCantidad(prod.id, 1)} 
                        className="w-9 h-9 bg-white text-red-600 font-bold rounded-lg shadow-sm text-lg active:scale-95 hover:bg-red-600 hover:text-white transition-all duration-150 border border-red-100"
                      >+</button>
                      
                      {carrito[prod.id] > 0 && (
                        <>
                          <span className="font-black text-gray-800 text-sm min-w-[20px] text-center">{carrito[prod.id]}</span>
                          <button 
                            onClick={() => actualizarCantidad(prod.id, -1)} 
                            className="w-9 h-9 bg-white text-gray-500 font-bold rounded-lg shadow-sm text-lg active:scale-95 hover:bg-gray-100 transition-all duration-150 border border-gray-200"
                          >−</button>
                        </>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </section>
          ))}
      </main>

      {/* FOOTER FLOTANTE (Igual que antes) */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-4 z-30 animate-in slide-in-from-bottom-4">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
            <div className="flex justify-between items-baseline mb-3 px-1">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-500 font-medium">{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</span>
                </div>
              </div>
              <span className="text-3xl font-black bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent">
                ${precioTotal}
              </span>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Tu nombre..." 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-sm flex-1 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              />
              <button 
                onClick={confirmarPedido}
                disabled={enviando}
                className="bg-gradient-to-br from-red-600 to-red-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all hover:shadow-xl hover:shadow-red-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {enviando ? "..." : "PEDIR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}