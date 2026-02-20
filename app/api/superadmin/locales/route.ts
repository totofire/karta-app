import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdmin } from "@/lib/auth";
import { randomBytes } from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/locales
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const locales = await prisma.local.findMany({
    orderBy: { fechaAlta: "desc" },
    include: {
      usuarios: {
        where: { rol: "ADMIN" },
        select: { nombre: true, email: true, activo: true },
        take: 1,
      },
      _count: { select: { mesas: true } },
    },
  });

  const metricas = await prisma.sesion.groupBy({
    by: ["localId"],
    where: { fechaFin: { gte: inicioMes } },
    _sum:   { totalVenta: true },
    _count: { id: true },
    _avg:   { totalVenta: true },
  });

  const metricaMap = new Map(metricas.map((m) => [m.localId, m]));

  const data = locales.map((local) => {
    const m = metricaMap.get(local.id);
    return {
      id:         local.id,
      nombre:     local.nombre,
      slug:       local.slug,
      estado:     local.estado,
      plan:       local.plan,
      montoPlan:  local.montoPlan,
      trialHasta: local.trialHasta,
      fechaVence: local.fechaVence,
      fechaAlta:  local.fechaAlta,
      notasAdmin: local.notasAdmin,
      admin:      local.usuarios[0] ?? null,
      mesas:      local._count.mesas,
      mes: {
        ventaTotal:     m?._sum.totalVenta ?? 0,
        sesiones:       m?._count.id       ?? 0,
        ticketPromedio: m?._avg.totalVenta ? Math.round(m._avg.totalVenta) : 0,
      },
    };
  });

  return NextResponse.json({ locales: data });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/locales
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const session = await getSuperAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const {
      nombreLocal,
      direccion,
      nombreAdmin,
      emailAdmin,
      plan      = "DEMO",
      trialDias = 14,
    } = await req.json();

    if (!nombreLocal || !nombreAdmin || !emailAdmin) {
      return NextResponse.json(
        { error: "nombreLocal, nombreAdmin y emailAdmin son obligatorios" },
        { status: 400 }
      );
    }

    const existe = await prisma.usuario.findUnique({ where: { email: emailAdmin } });
    if (existe) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }

    const trialHasta = new Date();
    trialHasta.setDate(trialHasta.getDate() + trialDias);

    const slug = nombreLocal
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const inviteToken  = randomBytes(32).toString("hex");
    const inviteExpira = new Date();
    inviteExpira.setHours(inviteExpira.getHours() + 48);

    const { local, usuario } = await prisma.$transaction(async (tx) => {
      const local = await tx.local.create({
        data: { nombre: nombreLocal, direccion: direccion || null, slug, estado: "DEMO", plan: plan as any, trialHasta },
      });
      await tx.configuracion.create({ data: { localId: local.id } });
      const usuario = await tx.usuario.create({
        data: { nombre: nombreAdmin, email: emailAdmin, password: null, rol: "ADMIN", activo: false, localId: local.id, inviteToken, inviteExpira },
      });
      return { local, usuario };
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/activar-cuenta?token=${inviteToken}`;

    // ── Enviar mail con Resend ─────────────────────────────────────────────
    const { error: resendError } = await resend.emails.send({
      from: "Karta <onboarding@resend.dev>",
      to:      emailAdmin,
      subject: `${nombreLocal} fue registrado en Karta — activá tu cuenta`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
          <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
              <tr><td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid #1f2937;overflow:hidden;">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#065f46,#064e3b);padding:32px;text-align:center;">
                      <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">Karta</div>
                      <div style="font-size:13px;color:#6ee7b7;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Sistema gastronómico</div>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 32px;">
                      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Bienvenido a Karta</p>
                      <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#fff;line-height:1.2;">Hola, ${nombreAdmin.split(" ")[0]} 👋</h1>
                      <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6;">
                        Tu local <strong style="color:#fff;">${nombreLocal}</strong> fue registrado en Karta.
                        Para empezar a operar, creá tu contraseña y activá tu cuenta.
                      </p>

                      <!-- Info box -->
                      <div style="background:#1f2937;border:1px solid #374151;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Detalles de tu cuenta</div>
                        <div style="color:#e5e7eb;font-size:14px;margin-bottom:4px;">🏠 <strong>Local:</strong> ${nombreLocal}</div>
                        <div style="color:#e5e7eb;font-size:14px;margin-bottom:4px;">👤 <strong>Admin:</strong> ${nombreAdmin}</div>
                        <div style="color:#e5e7eb;font-size:14px;">✉️ <strong>Email:</strong> ${emailAdmin}</div>
                      </div>

                      <!-- CTA -->
                      <div style="text-align:center;margin-bottom:28px;">
                        <a href="${inviteUrl}" style="display:inline-block;background:#10b981;color:#fff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;">
                          Activar mi cuenta →
                        </a>
                      </div>

                      <!-- Warning -->
                      <div style="background:#451a03;border:1px solid #92400e;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
                        <p style="margin:0;font-size:13px;color:#fcd34d;">
                          ⏳ Este link expira en <strong>48 horas</strong>. Si no lo activás a tiempo, pedile al administrador de Karta que reenvíe la invitación.
                        </p>
                      </div>

                      <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
                        Si el botón no funciona, copiá este link:<br />
                        <a href="${inviteUrl}" style="color:#10b981;word-break:break-all;">${inviteUrl}</a>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="border-top:1px solid #1f2937;padding:20px 32px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#4b5563;">
                        Karta · Sistema de gestión gastronómica<br />
                        Si recibiste este mail por error, podés ignorarlo.
                      </p>
                    </td>
                  </tr>

                </table>
              </td></tr>
            </table>
          </body>
        </html>
      `,
    });

    if (resendError) {
      console.error("⚠️  Error enviando invite email:", resendError);
    } else {
      console.log(`✉️  Invite enviado a ${emailAdmin}`);
    }

    return NextResponse.json({
      success:      true,
      emailEnviado: !resendError,
      local:   { id: local.id, nombre: local.nombre, slug: local.slug, trialHasta: local.trialHasta },
      usuario: { id: usuario.id, email: usuario.email },
      ...(process.env.NODE_ENV !== "production" && { inviteUrl }),
    });

  } catch (error) {
    console.error("Error creando local:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}