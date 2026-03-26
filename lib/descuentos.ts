import { prisma } from "@/lib/prisma";
import { filtrarReglasVigentes } from "@/lib/descuentos-utils";

export type { ReglaActiva, ItemParaPedido, ItemConDescuento } from "@/lib/descuentos-utils";
export {
  aplicarReglasAItems,
  calcularDescuentoSesion,
  filtrarReglasVigentes,
} from "@/lib/descuentos-utils";

// ─── Obtener reglas vigentes ahora desde la BD ───────────────────────────────

export async function obtenerReglasActivas(localId: number) {
  const reglas = await prisma.reglaDescuento.findMany({
    where: { localId, activo: true },
  });
  return filtrarReglasVigentes(reglas, new Date());
}
