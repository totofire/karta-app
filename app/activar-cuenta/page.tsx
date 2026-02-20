"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, AlertCircle, KeyRound } from "lucide-react";

type Estado = "cargando" | "valido" | "invalido" | "activando" | "activado";

interface InfoToken {
  nombre:      string;
  email:       string;
  localNombre: string | null;
}

export default function ActivarCuentaPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [estado,       setEstado]       = useState<Estado>("cargando");
  const [info,         setInfo]         = useState<InfoToken | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string>("");
  const [password,     setPassword]     = useState("");
  const [confirmar,    setConfirmar]    = useState("");
  const [verPass,      setVerPass]      = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  // ── Validar token al montar ───────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setEstado("invalido");
      setErrorMsg("No se encontró el token de activación.");
      return;
    }

    fetch(`/api/auth/invite?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valido) {
          setInfo({
            nombre:      data.nombre,
            email:       data.email,
            localNombre: data.localNombre,
          });
          setEstado("valido");
        } else {
          setEstado("invalido");
          setErrorMsg(data.error ?? "El link no es válido.");
        }
      })
      .catch(() => {
        setEstado("invalido");
        setErrorMsg("No se pudo verificar el link. Revisá tu conexión.");
      });
  }, [token]);

  // ── Activar cuenta ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setEstado("activando");

    const res  = await fetch("/api/auth/invite", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, password }),
    });
    const data = await res.json();

    if (res.ok) {
      setEstado("activado");
      setTimeout(() => router.push("/login"), 2500);
    } else {
      setEstado("valido");
      setErrorMsg(data.error ?? "Ocurrió un error. Intentá de nuevo.");
    }
  }

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">

      {/* Fondo sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-emerald-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <KeyRound className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Karta</h1>
          <p className="text-gray-500 text-sm mt-1">Activación de cuenta</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* ── CARGANDO ── */}
          {estado === "cargando" && (
            <div className="p-10 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-gray-400 text-sm">Verificando invitación…</p>
            </div>
          )}

          {/* ── TOKEN INVÁLIDO ── */}
          {estado === "invalido" && (
            <div className="p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Link inválido</h2>
                <p className="text-gray-400 text-sm mt-1 leading-relaxed">{errorMsg}</p>
              </div>
              <p className="text-gray-600 text-xs">
                Si el problema persiste, contactá al administrador de la plataforma.
              </p>
            </div>
          )}

          {/* ── ACTIVADO ── */}
          {estado === "activado" && (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">¡Cuenta activada!</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Ya podés ingresar a tu panel. Redirigiendo…
                </p>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ animation: "progress 2.5s linear forwards", width: "100%" }}
                />
              </div>
            </div>
          )}

          {/* ── FORMULARIO ── */}
          {(estado === "valido" || estado === "activando") && info && (
            <form onSubmit={handleSubmit}>

              {/* Bienvenida */}
              <div className="px-8 pt-8 pb-6 border-b border-gray-800">
                <p className="text-gray-400 text-xs uppercase tracking-widest font-medium mb-1">
                  Bienvenido a Karta
                </p>
                <h2 className="text-white font-bold text-xl leading-tight">
                  Hola, {info.nombre.split(" ")[0]}
                </h2>
                {info.localNombre && (
                  <p className="text-emerald-400 text-sm mt-1">
                    Local: <span className="font-semibold">{info.localNombre}</span>
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-2">
                  Creá tu contraseña para activar tu cuenta.
                </p>
              </div>

              <div className="px-8 py-6 space-y-4">

                {/* Email (solo display) */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Email
                  </label>
                  <div className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-gray-500 text-sm">
                    {info.email}
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={verPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoFocus
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setVerPass(!verPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                    >
                      {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={verConfirmar ? "text" : "password"}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      placeholder="Repetí la contraseña"
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-11 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirmar(!verConfirmar)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                    >
                      {verConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-400 text-xs leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={estado === "activando"}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 text-sm transition flex items-center justify-center gap-2 mt-2"
                >
                  {estado === "activando" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Activando cuenta…
                    </>
                  ) : (
                    "Activar mi cuenta"
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-gray-700 text-xs mt-6">
          Karta · Sistema de gestión gastronómica
        </p>
      </div>
    </div>
  );
}