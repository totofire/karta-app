"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return toast.error("Completá todos los datos", { duration: 4000 });
    }

    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.success("Bienvenido, Jefe", { duration: 2000 });
      setTimeout(() => {
        toast.dismiss();
        router.push("/admin");
      }, 2000);
    } else {
      toast.error("Datos incorrectos", { duration: 4000 });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-red-900 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        
        <div className="text-center mb-8">
          {/* --- CAMBIOS AQUÍ: Fondo blanco, sin sombra interna, más grande --- */}
          <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg p-2 border-4 border-red-50">
            <div className="relative w-full h-full">
                <Image 
                    src="/logo2.png" 
                    alt="Karta" 
                    fill
                    className="object-contain" 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                />
            </div>
          </div>
          {/* ------------------------------------------------------------------ */}
          
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">KARTA ADMIN</h1>
          <p className="text-gray-400 text-sm mt-1">Panel de Gestión</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Mail size={20} />
            </div>
            <input
              type="email"
              placeholder="tu@email.com"
              className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-700"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Lock size={20} />
            </div>
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-700"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? "Entrando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-300 uppercase tracking-widest font-semibold">Sistema Privado</p>
        </div>
      </div>
    </div>
  );
}