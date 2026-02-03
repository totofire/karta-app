"use client";
import { useState } from "react";
import Image from "next/image";

export default function MenuInterface({ mesa, categorias }: any) {
  // LÓGICA DE INTERFAZ (Estados)
  const [carrito, setCarrito] = useState<any>({});
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState(categorias[0]?.id || 0);

  // Lógica para sumar/restar productos
  const actualizarCantidad = (productoId: number, delta: number) => {
    setCarrito((prev: any) => {
      const actual = prev[productoId] || 0;
      const nuevo = Math.max(0, actual + delta);
      // Si llega a 0, borramos la clave del objeto para que no ocupe memoria
      if (nuevo === 0) {
        const { [productoId]: _, ...resto } = prev; 
        return resto;
      }
      return { ...prev, [productoId]: nuevo };
    });
  };

  // Lógica de Totales (Matemática simple)
  const totalItems = Object.values(carrito).reduce((a: number, b: any) => a + Number(b), 0);
  
  // Calcular precio total recorriendo el carrito
  const precioTotal = categorias.flatMap((c: any) => c.productos).reduce((total: number, p: any) => {
    return total + (p.precio * (carrito[p.id] || 0));
  }, 0);

  // Lógica de Enviar Pedido (Conectar con la API)
  const confirmarPedido = async () => {
    if (!nombre.trim()) return alert("¡Para! Decinos tu nombre para llamarte.");
    
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
        setCarrito({}); // Limpiamos el carrito
        setNombre("");
      } else {
        alert("Hubo un error al pedir. Llamá al mozo.");
      }
    } catch (error) {
      alert("Error de conexión");
    }
    setEnviando(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* HEADER CON LOGO Y CATEGORÍAS */}
      <header className="bg-red-600 text-white p-6 shadow-lg rounded-b-[2rem] relative z-10 sticky top-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            {/* LOGO */}
            <div className="bg-white p-1 rounded-full shadow-md">
              <Image 
                src="/logo.png"
                alt="Logo" 
                width={40} 
                height={40} 
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">KARTA</h1>
              <p className="text-xs opacity-90 font-medium">Bienvenido a {mesa.nombre}</p>
            </div>
          </div>
        </div>

        {/* CATEGORÍAS (Scroll Horizontal) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categorias.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaActiva(cat.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                ${categoriaActiva === cat.id 
                  ? 'bg-white text-red-600 shadow-md transform scale-105' 
                  : 'bg-black/20 text-white hover:bg-black/30'}
              `}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </header>

      {/* CARTA - PRODUCTOS FILTRADOS POR CATEGORÍA */}
      <main className="p-4 space-y-8">
        {categorias
          .filter((cat: any) => cat.id === categoriaActiva)
          .map((cat: any) => (
            <section key={cat.id} className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{cat.nombre}</h2>
              <div className="grid gap-4">
                {cat.productos.map((prod: any) => (
                  <div key={prod.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-row justify-between items-center gap-4 relative overflow-hidden group">
                    
                    {/* Decoración lateral de color */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight">{prod.nombre}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{prod.descripcion}</p>
                      <p className="text-red-600 font-black text-lg mt-2">${prod.precio}</p>
                    </div>

                    {/* CONTROLES BOTONES */}
                    <div className="flex flex-col items-center gap-1 bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => actualizarCantidad(prod.id, 1)} 
                        className="w-10 h-10 bg-white text-red-600 font-bold rounded-md shadow text-xl active:bg-red-50 hover:bg-red-600 hover:text-white transition-colors"
                      >+</button>
                      
                      {carrito[prod.id] > 0 && (
                        <>
                          <span className="font-bold text-gray-800">{carrito[prod.id]}</span>
                          <button 
                            onClick={() => actualizarCantidad(prod.id, -1)} 
                            className="w-10 h-10 bg-white text-gray-400 font-bold rounded-md shadow text-xl active:bg-gray-50"
                          >-</button>
                        </>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </section>
          ))}
      </main>

      {/* FOOTER FLOTANTE (Total y Pagar) */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-4 shadow-2xl z-30">
          <div className="max-w-md mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-gray-500 text-sm">Total a pagar:</span>
              <span className="text-3xl font-black text-gray-900">${precioTotal}</span>
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Tu nombre..." 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="bg-gray-100 border-0 rounded-lg px-4 font-medium w-1/3 focus:ring-2 focus:ring-red-500 outline-none"
              />
              <button 
                onClick={confirmarPedido}
                disabled={enviando}
                className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-red-200 active:scale-95 transition-all text-lg hover:brightness-110"
              >
                {enviando ? "ENVIANDO..." : `PEDIR ${totalItems} ÍTEMS`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}