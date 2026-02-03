import "./globals.css";
import type { Metadata } from "next";
import { LoaderProvider } from "@/context/LoaderContext"; //

export const metadata: Metadata = {
  title: "Karta - Menú Digital",
  description: "Pedí rápido, comé rico.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50 text-gray-900">
        {/* Envolvemos la aplicación con el proveedor del loader global */}
        <LoaderProvider> 
          {children}
        </LoaderProvider>
      </body>
    </html>
  );
}