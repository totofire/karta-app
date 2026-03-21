"use client";
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-red-600 p-5 rounded-2xl mb-6 shadow-2xl">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1 className="text-white text-2xl font-black mb-2">Sin conexión</h1>
      <p className="text-slate-400 text-base font-medium mb-8 max-w-xs">
        Revisá tu conexión a internet y volvé a intentarlo.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-red-600 text-white font-black px-8 py-4 rounded-2xl text-base active:scale-95 transition-transform"
      >
        Reintentar
      </button>

      <p className="text-slate-600 text-xs font-bold mt-10 uppercase tracking-widest">
        Karta — Panel Mozo
      </p>
    </div>
  );
}
