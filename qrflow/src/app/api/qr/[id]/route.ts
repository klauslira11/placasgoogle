import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qrUpdateSchema, validateSlug } from "@/lib/validators";
import { requireUser } from "@/lib/auth-helpers";
import { getNfcUrlByNumber, getQrUrlByNumber } from "@/lib/qr";
import { getPlacaMetrics } from "@/lib/metrics";

function withUrls(q: any) {
  return {
    ...q,
    qrUrl: q.placaNumber ? getQrUrlByNumber(q.placaNumber) : null,
    nfcUrl: q.placaNumber ? getNfcUrlByNumber(q.placaNumber) : null,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const qr = await prisma.qrCode.findFirst({
    where: { id, userId: user.id, archivedAt: null },
  });
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const metrics = await getPlacaMetrics(id);
  return NextResponse.json({ ...withUrls(qr), metrics });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.qrCode.findFirst({ where: { id, userId: user.id, archivedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  // allow slug change? spec says slug never changes after creation via destination change, but allow name/url/status/colors editing
  // We will allow slug only if explicitly provided and valid, but keep stable otherwise.
  // For safety, ignore slug if provided equal to existing; if different, validate uniqueness.
  const parsed = qrUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let slug = parsed.data.slug?.trim().toLowerCase();
  if (slug && slug !== existing.slug) {
    const err = validateSlug(slug);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const exists = await prisma.qrCode.findUnique({ where: { slug } });
    if (exists) return NextResponse.json({ error: "Slug já existe" }, { status: 409 });
  } else {
    slug = undefined;
  }

  // Destino é único: editar por QR ou por NFC atualiza os dois canais juntos.
  // Pausas são independentes por canal (qrStatus / nfcStatus).
  // mantém alias legado: `status` equivale ao canal QR
  const qrStatus = parsed.data.qrStatus ?? parsed.data.status ?? undefined;
  const data: any = {
    name: parsed.data.name ?? undefined,
    destinationUrl: parsed.data.destinationUrl ?? undefined,
    slug: slug ?? undefined,
    fgColor: parsed.data.fgColor ?? undefined,
    bgColor: parsed.data.bgColor ?? undefined,
    margin: parsed.data.margin ?? undefined,
    size: parsed.data.size ?? undefined,
    errorLevel: parsed.data.errorLevel as any,
    transparentBg: parsed.data.transparentBg ?? undefined,
    qrStatus: (qrStatus ?? undefined) as any,
    nfcStatus: (parsed.data.nfcStatus ?? undefined) as any,
  };
  if (parsed.data.archived !== undefined) {
    data.archivedAt = parsed.data.archived ? new Date() : null;
  }

  const updated = await prisma.qrCode.update({ where: { id }, data });
  return NextResponse.json(withUrls(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.qrCode.findFirst({ where: { id, userId: user.id, archivedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Exclusão lógica: arquiva em vez de apagar (preserva histórico e métricas)
  await prisma.qrCode.update({ where: { id }, data: { archivedAt: new Date() } });
  return NextResponse.json({ ok: true, archived: true });
}
