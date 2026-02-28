// app/mozo/layout.tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Karta — Mozo",
  description: "Panel de operaciones",
  icons: {
    apple: "/apple-touch-icon.png",   // ← agregá esta línea
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Karta Mozo",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,           // Evita zoom accidental en el celu
};

export default function MozoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
