import Image from "next/image";

export default function GlobalLoader() {
  return (
    // 1. Fondo de pantalla completa (Overlay)
    // Cambié el fondo a un gris oscuro translúcido (bg-black/30) para que el círculo blanco resalte más.
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity px-4">
      
      {/* 2. El Círculo Blanco (Contenedor Principal) */}
      {/* - bg-white rounded-full: Crea el círculo blanco sólido.
          - shadow-[0_0_50px_rgba(220,38,38,0.3)]: Una sombra roja difuminada estilo "resplandor".
          - p-8: Mucho espacio interno (padding) para que el logo respire.
          - animate-pulse: Todo el círculo blanco es el que "respira".
      */}
      <div className="bg-white rounded-full p-8 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-pulse flex items-center justify-center">
        
        {/* 3. Contenedor del Logo (Dimensiones) */}
        {/* - w-32 h-32: Tamaño base grande para celular (128px).
            - md:w-48 md:h-48: En pantallas medianas/grandes crece aún más (192px).
        */}
        <div className="relative w-32 h-32 md:w-48 md:h-48">
          <Image
            src="/logo-carga.png"
            alt="Cargando..."
            fill
            // object-contain asegura que el logo entero se vea dentro del espacio sin cortarse
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* 4. Texto debajo */}
      <p className="mt-8 text-base font-black text-white uppercase tracking-[0.2em] animate-pulse drop-shadow-lg">
        Cargando...
      </p>
    </div>
  );
}