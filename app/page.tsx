export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">
        Sistema de Pedidos
      </h1>
      <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100">
        <p className="text-gray-600">
          Backend listo. Frontend listo.
          <br />
          <span className="font-semibold text-sm text-gray-400">Esperando base de datos...</span>
        </p>
      </div>
    </div>
  );
}