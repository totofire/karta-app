import "./globals.css"; // <--- ESTA LÍNEA ES LA CLAVE
import type { Metadata } from "next";

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
        {children}
      </body>
    </html>
  );
}