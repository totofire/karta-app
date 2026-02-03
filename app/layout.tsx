import "./globals.css";
import type { Metadata } from "next";
import { LoaderProvider } from "@/context/LoaderContext"; //
import { Toaster } from "react-hot-toast"; // <--- IMPORTAR

export const metadata: Metadata = {
  title: "Karta - Menú Digital",
  description: "Pedí rápido, comé rico.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50 text-gray-900">
        <LoaderProvider>
          {children}
          {/* Agregamos el Toaster acá para que flote sobre todo */}
          <Toaster 
            position="top-center" 
            reverseOrder={false}
            toastOptions={{
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              },
              success: {
                style: { background: '#DEF7EC', color: '#03543F' }, // Verde suave
              },
              error: {
                style: { background: '#FDE8E8', color: '#9B1C1C' }, // Rojo suave
              },
            }}
          />
        </LoaderProvider>
      </body>
    </html>
  );
}