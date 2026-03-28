// app/mozo/layout.tsx
import type { Metadata, Viewport } from "next";
import InstalarPWA from "@/components/InstalarPWA";
import RegistrarSW from "@/components/RegistrarSW";

export const metadata: Metadata = {
  title: "Karta — Mozo",
  description: "Panel de operaciones",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/apple-touch-icon.png",
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
  userScalable: false,
};

export default function MozoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegistrarSW />
      {children}
      <InstalarPWA />
    </>
  );
}
