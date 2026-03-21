import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Karta — Panel Mozo",
    short_name: "Karta Mozo",
    description: "Panel de operaciones para mozos de Karta",
    start_url: "/mozo",
    scope: "/mozo",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#dc2626",
    categories: ["food", "productivity"],
    icons: [
      {
        src: "/icons/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
