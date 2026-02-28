import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalId } from "@/lib/auth";

export async function POST() {
  const localId = await getLocalId();
  if (!localId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await prisma.local.update({
    where: { id: localId },
    data: {
      mpAccessToken:  null,
      mpRefreshToken: null,
      mpUserId:       null,
      mpEmail:        null,
      mpConectadoEn:  null,
    },
  });

  return NextResponse.json({ success: true });
}