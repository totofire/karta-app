// app/admin/configuracion/page.tsx
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";
import MercadoPagoConnect from "@/components/MercadoPagoConnect";
import StockToggle from "@/components/StockToggle";
import KdsAlertaConfig from "@/components/KdsAlertaConfig";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage({ searchParams }: any) {
  const localId = await getLocalId();

  const [local, config] = await Promise.all([
    localId
      ? prisma.local.findUnique({
          where: { id: localId },
          select: { mpEmail: true, mpConectadoEn: true },
        })
      : null,
    localId
      ? prisma.configuracion.findUnique({
          where: { localId },
          select: { usaStock: true, alertaKdsMinutos: true },
        })
      : null,
  ]);

  return (
    <div className="max-w-lg mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-black text-gray-800">Configuración</h1>

      {searchParams?.mp === "conectado" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-bold text-sm">
          ✅ Mercado Pago conectado exitosamente
        </div>
      )}
      {searchParams?.mp === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 font-bold text-sm">
          ❌ Error al conectar Mercado Pago. Intentá de nuevo.
        </div>
      )}

      <StockToggle usaStock={config?.usaStock ?? false} />

      <KdsAlertaConfig inicial={config?.alertaKdsMinutos ?? 15} />

      <MercadoPagoConnect
        mpEmail={local?.mpEmail ?? null}
        mpConectadoEn={local?.mpConectadoEn?.toISOString() ?? null}
      />
    </div>
  );
}