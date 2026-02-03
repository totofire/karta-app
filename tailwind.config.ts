import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ACÁ PONÉ TU CÓDIGO DE COLOR EXACTO 👇
        brand: {
          DEFAULT: "#FF5733", // <--- Tu color principal (ej. Naranja)
          light: "#FF8A65",   // <--- Un tono más claro (opcional)
          dark: "#C43010",    // <--- Un tono más oscuro (opcional)
        },
      },
    },
  },
  plugins: [],
};
export default config;