// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next"; // <--- Importar Viewport
import { LoaderProvider } from "@/context/LoaderContext";
import { Toaster } from "react-hot-toast";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Esto bloquea el zoom pellizcando
};
export const metadata: Metadata = {
  title: "Karta - Menú Digital",
  description: "Pedí rápido, comé rico.",
  icons: {
    icon: "/logo-karta.png",      // Usamos tu logo cuadrado que ya está en public
    apple: "/logo-karta.png",     // Icono para accesos directos en iPhone/iPad
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50 text-gray-900">
        <LoaderProvider>
          {children}
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
                style: { background: '#DEF7EC', color: '#03543F' },
              },
              error: {
                style: { background: '#FDE8E8', color: '#9B1C1C' },
              },
            }}
          />
        </LoaderProvider>
      </body>
    </html>
  );
}