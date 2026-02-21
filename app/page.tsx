"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  QrCode, 
  Utensils, 
  ChefHat, 
  TrendingUp,
  Clock,
  BarChart3,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  CheckCircle,
  MessageCircle,
  Mail,
  Phone,
} from "lucide-react";

// ── Reemplazá estos valores con los tuyos ─────────────────────────────────────
const WHATSAPP_NUMBER = "3424276231"; // sin + ni espacios.
const WHATSAPP_MSG    = encodeURIComponent("Hola, quiero saber más sobre Karta para mi restaurante");
const EMAIL_CONTACTO  = "tomasfernandezz278@gmail.com";
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formEnviado, setFormEnviado] = useState(false);
  const [form, setForm] = useState({ nombre: "", restaurante: "", email: "", mensaje: "" });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleForm = (e: React.FormEvent) => {
    e.preventDefault();
    // Abre WhatsApp con los datos del form
    const msg = encodeURIComponent(
      `Hola Karta! \nNombre: ${form.nombre}\nRestaurante: ${form.restaurante}\nEmail: ${form.email}\nConsulta: ${form.mensaje}`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
    setFormEnviado(true);
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="relative h-12 w-36 flex-shrink-0">
              <Image src="/logo2.png" alt="Karta" fill className="object-contain object-left" priority />
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <a
                href="#contacto"
                className="px-5 py-2.5 rounded-full border-2 border-[#A62E2E] text-[#A62E2E] font-bold hover:bg-[#A62E2E]/5 transition-all duration-300"
              >
                Contacto
              </a>
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-full bg-[#A62E2E] text-white font-bold hover:bg-[#8C2626] transition-all duration-300 shadow-lg shadow-[#A62E2E]/20"
              >
                Ingresar
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-6 py-4 space-y-3">
              <a href="#contacto" className="block w-full text-center px-6 py-3 rounded-full border-2 border-[#A62E2E] text-[#A62E2E] font-bold">
                Contacto
              </a>
              <Link href="/login" className="block w-full text-center px-6 py-3 rounded-full bg-[#A62E2E] text-white font-bold">
                Ingresar
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-[#A62E2E]/5 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Text */}
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A62E2E]/10 border border-[#A62E2E]/20">
                <Sparkles size={16} className="text-[#A62E2E]" />
                <span className="text-sm font-bold text-[#8C2626]">Sistema Operativo Gastronómico</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
                La evolución de tu{" "}
                <span className="text-[#A62E2E]">restaurante</span>
              </h1>

              <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed font-medium">
                Aumentá la rotación de mesas y el ticket promedio. 
                Tu cocina recibe pedidos en tiempo real mientras tus clientes disfrutan de una experiencia fluida.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a
                  href="#contacto"
                  className="group px-8 py-4 rounded-full bg-[#A62E2E] text-white font-bold text-lg hover:bg-[#8C2626] transition-all duration-300 shadow-xl shadow-[#A62E2E]/30 hover:shadow-2xl hover:shadow-[#A62E2E]/40 hover:scale-105 flex items-center justify-center gap-2"
                >
                  Quiero empezar
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded-full border-2 border-gray-200 text-gray-700 font-bold text-lg hover:border-green-500 hover:text-green-600 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  Escribinos por WhatsApp
                </a>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#A62E2E]/10 rounded-lg flex items-center justify-center">
                    <TrendingUp size={20} className="text-[#A62E2E]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-[#A62E2E]">+35%</div>
                    <div className="text-sm text-gray-500 font-medium">Rotación de mesas</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-[#A62E2E]">-60%</div>
                    <div className="text-sm text-gray-500 font-medium">Errores de comanda</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock size={20} className="text-blue-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-[#A62E2E]">2min</div>
                    <div className="text-sm text-gray-500 font-medium">Tiempo de pedido</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup */}
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
              <div className="relative aspect-square lg:aspect-auto lg:h-[600px]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-[580px] bg-gray-900 rounded-[3rem] shadow-2xl shadow-gray-900/30 border-8 border-gray-800 overflow-hidden transform hover:scale-105 transition-transform duration-500">
                  <div className="w-full h-full bg-gradient-to-br from-white to-gray-50 p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#A62E2E] rounded-lg flex items-center justify-center text-white text-xs font-black">3</div>
                        <div>
                          <div className="text-xs font-bold text-gray-700">Mesa 3</div>
                          <div className="text-[10px] text-gray-400">Salón Principal</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <div className="w-1 h-1 bg-[#A62E2E] rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        { icon: "🍔", color: "from-[#A62E2E]/20 to-[#8C2626]/10" },
                        { icon: "🍕", color: "from-orange-100 to-orange-50" },
                        { icon: "🥗", color: "from-green-100 to-green-50" },
                      ].map((item, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-3">
                          <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-xl flex-shrink-0 flex items-center justify-center text-2xl`}>
                            {item.icon}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-2 bg-gray-100 rounded w-1/2" />
                            <div className="h-4 bg-[#A62E2E]/20 rounded w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="absolute -left-8 top-20 w-32 h-32 bg-white rounded-2xl shadow-xl shadow-gray-900/20 border-4 border-white p-4 animate-float flex items-center justify-center">
                  <QrCode size={80} className="text-[#A62E2E]" strokeWidth={1.5} />
                </div>

                <div className="absolute -right-8 bottom-24 bg-white rounded-2xl shadow-xl shadow-gray-900/20 border border-gray-100 p-4 animate-float-delayed">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp size={16} className="text-green-600" />
                    </div>
                    <div className="text-xs font-bold text-gray-400">Pedido enviado</div>
                  </div>
                  <div className="text-2xl font-black text-gray-900">Mesa 3</div>
                  <div className="text-sm text-gray-500">$4.500 • 3 items</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A62E2E]/10 border border-[#A62E2E]/20 mb-6">
              <span className="text-sm font-bold text-[#8C2626]">Proceso Simple</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-6">
              ¿Cómo funciona <span className="text-[#A62E2E]">Karta</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tres pasos que revolucionan la experiencia de tu restaurante
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { num: 1, icon: <QrCode size={32} className="text-white" strokeWidth={2.5} />, title: "Cliente escanea QR", desc: "El comensal llega, se sienta y escanea el código QR de la mesa. Sin descargar apps ni registrarse." },
              { num: 2, icon: <Utensils size={32} className="text-white" strokeWidth={2.5} />, title: "Elige sus platos", desc: "Ve el menú completo con fotos y precios. Arma su pedido a su ritmo y lo envía cuando está listo." },
              { num: 3, icon: <ChefHat size={32} className="text-white" strokeWidth={2.5} />, title: "Cocina recibe al instante", desc: "El pedido llega en tiempo real a tu pantalla de cocina (KDS). Sin errores, sin esperas, sin papel." },
            ].map(s => (
              <div key={s.num} className="group relative">
                <div className="absolute -inset-2 bg-gradient-to-br from-[#A62E2E]/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
                <div className="relative bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 h-full">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#A62E2E] rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {s.num}
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-[#A62E2E] to-[#8C2626] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-[#A62E2E]/30">
                    {s.icon}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4">{s.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A62E2E]/10 border border-[#A62E2E]/20 mb-6">
              <span className="text-sm font-bold text-[#8C2626]">Funcionalidades</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-6">
              Todo lo que necesitás en un{" "}
              <span className="text-[#A62E2E]">solo lugar</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2 lg:col-span-2 group relative bg-gradient-to-br from-[#A62E2E] to-[#8C2626] rounded-3xl p-10 overflow-hidden shadow-2xl shadow-[#A62E2E]/30 hover:shadow-[#A62E2E]/50 transition-all duration-500">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-white rounded-full blur-2xl" />
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6">
                  <ChefHat size={32} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl lg:text-4xl font-black text-white mb-4">KDS en Cocina</h3>
                <p className="text-white/90 text-lg leading-relaxed mb-8">
                  Pantalla profesional que muestra todos los pedidos en tiempo real. Tu cocina trabaja más rápido y organizada.
                </p>
                <div className="flex gap-6">
                  <div className="bg-white/20 backdrop-blur-xl px-4 py-2 rounded-full">
                    <div className="text-white font-black">-40%</div>
                    <div className="text-white/70 text-xs">Tiempo de prep.</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-xl px-4 py-2 rounded-full">
                    <div className="text-white font-black">0</div>
                    <div className="text-white/70 text-xs">Errores papel</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#A62E2E]/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#A62E2E] to-[#8C2626] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-[#A62E2E]/20">
                  <Clock size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Menú Autogestionable</h3>
                <p className="text-gray-600 leading-relaxed">Cambiá precios, productos y fotos desde tu panel en segundos. Sin esperar a nadie.</p>
              </div>
            </div>

            <div className="group relative bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#A62E2E]/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#A62E2E] to-[#8C2626] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-[#A62E2E]/20">
                  <BarChart3 size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Métricas en Tiempo Real</h3>
                <p className="text-gray-600 leading-relaxed">Sabé qué se vende, cuánto facturás y cómo optimizar tu carta con datos precisos.</p>
              </div>
            </div>

            <div className="md:col-span-2 group relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 overflow-hidden shadow-2xl hover:shadow-gray-900/50 transition-all duration-500">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6">
                    <Sparkles size={32} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-black text-white mb-4">Sin instalaciones complicadas</h3>
                  <p className="text-white/80 text-lg leading-relaxed">
                    No necesitás hardware costoso. Funciona en cualquier tablet, computadora o celular. Empezás hoy mismo.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border-4 border-white/20 group-hover:scale-110 transition-transform duration-500">
                    <div className="text-white font-black text-4xl">✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN CONTACTO ─────────────────────────────────────────────────── */}
      <section id="contacto" className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#A62E2E]/10 border border-[#A62E2E]/20 mb-6">
              <span className="text-sm font-bold text-[#8C2626]">Hablemos</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-black text-gray-900 mb-6">
              ¿Listo para <span className="text-[#A62E2E]">empezar</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Completá el formulario o escribinos directo. Te respondemos en menos de 24hs.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">

            {/* Canales de contacto */}
            <div className="space-y-6">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-5 p-6 bg-white rounded-2xl border-2 border-green-100 hover:border-green-400 shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-green-500/30">
                  <MessageCircle size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-black text-gray-900 text-lg">WhatsApp</div>
                  <div className="text-gray-500 text-sm mt-0.5">Respondemos rápido. La forma más directa.</div>
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-green-500 ml-auto transition-colors" />
              </a>

              <a
                href={`mailto:${EMAIL_CONTACTO}`}
                className="flex items-center gap-5 p-6 bg-white rounded-2xl border-2 border-[#A62E2E]/10 hover:border-[#A62E2E]/40 shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-14 h-14 bg-[#A62E2E] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-[#A62E2E]/30">
                  <Mail size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-black text-gray-900 text-lg">Email</div>
                  <div className="text-gray-500 text-sm mt-0.5">{EMAIL_CONTACTO}</div>
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-[#A62E2E] ml-auto transition-colors" />
              </a>

              {/* Garantías */}
              <div className="bg-gray-50 rounded-2xl p-6 space-y-3 border border-gray-100">
                {[
                  "Sin contrato de permanencia",
                  "Setup incluido sin costo",
                  "Soporte técnico en español",
                  "Funciona en cualquier dispositivo",
                ].map(g => (
                  <div key={g} className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" strokeWidth={2.5} />
                    {g}
                  </div>
                ))}
              </div>
            </div>

            {/* Formulario */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
              {formEnviado ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-green-500" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">¡Mensaje enviado!</h3>
                  <p className="text-gray-500">Se abrió WhatsApp con tu consulta. Te respondemos pronto.</p>
                  <button
                    onClick={() => setFormEnviado(false)}
                    className="mt-4 px-6 py-2.5 rounded-full border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-[#A62E2E] hover:text-[#A62E2E] transition-colors"
                  >
                    Enviar otra consulta
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForm} className="space-y-5">
                  <h3 className="text-xl font-black text-gray-800 mb-6">Contanos sobre tu negocio</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tu nombre</label>
                      <input
                        required
                        type="text"
                        placeholder="Juan García"
                        value={form.nombre}
                        onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A62E2E] focus:ring-2 focus:ring-[#A62E2E]/10 outline-none text-sm font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre del local</label>
                      <input
                        required
                        type="text"
                        placeholder="La Trattoria"
                        value={form.restaurante}
                        onChange={e => setForm(p => ({ ...p, restaurante: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A62E2E] focus:ring-2 focus:ring-[#A62E2E]/10 outline-none text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="juan@mirestaurante.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A62E2E] focus:ring-2 focus:ring-[#A62E2E]/10 outline-none text-sm font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">¿En qué te podemos ayudar?</label>
                    <textarea
                      rows={3}
                      placeholder="Tengo un restaurante de 20 mesas y quiero digitalizar los pedidos..."
                      value={form.mensaje}
                      onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A62E2E] focus:ring-2 focus:ring-[#A62E2E]/10 outline-none text-sm font-medium transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-[#A62E2E] text-white font-black text-base hover:bg-[#8C2626] active:scale-[0.98] transition-all shadow-lg shadow-[#A62E2E]/30 flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={20} />
                    Enviar por WhatsApp
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    Al enviar, se abrirá WhatsApp con tu mensaje pre-cargado.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-900 via-[#8C2626] to-[#A62E2E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Llevá tu restaurante al siguiente nivel
          </h2>
          <p className="text-xl lg:text-2xl text-white/90 mb-10 leading-relaxed">
            Unite a los restaurantes que ya están aumentando sus ventas con Karta
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#contacto"
              className="group px-10 py-5 rounded-full bg-white text-[#A62E2E] font-black text-lg hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-white/50 hover:scale-105 flex items-center justify-center gap-2"
            >
              Comenzar ahora
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 rounded-full border-2 border-white text-white font-bold text-lg hover:bg-white hover:text-[#A62E2E] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <MessageCircle size={20} />
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="relative h-20 w-36 mb-6">
                <Image src="/logo-karta.png" alt="Karta" fill className="object-contain" priority />
              </div>
              <p className="text-gray-400 leading-relaxed max-w-md">
                El sistema operativo gastronómico que revoluciona la forma en que los restaurantes atienden a sus clientes.
              </p>
            </div>
            <div>
              <h4 className="font-black text-white mb-4">Contacto</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`} target="_blank" rel="noopener noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-2">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </li>
                <li>
                  <a href={`mailto:${EMAIL_CONTACTO}`} className="hover:text-white transition-colors flex items-center gap-2">
                    <Mail size={14} /> {EMAIL_CONTACTO}
                  </a>
                </li>
              </ul>
            </div>
           
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-500 text-sm">© 2026 Karta. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <Link href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Términos</Link>
              <Link href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 3s ease-in-out infinite 0.5s; }
      `}</style>
    </div>
  );
}