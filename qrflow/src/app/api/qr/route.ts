import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qrCreateSchema, validateSlug } from "@/lib/validators";
import { requireUser } from "@/lib/auth-helpers";
import { generateSlug, getNfcUrlByNumber, getQrUrlByNumber, generateQrPngBuffer } from "@/lib/qr";
import { composePlacaBuffer } from "@/lib/placa";
import { savePlacaPng, saveQrPng } from "@/lib/storage";
import { withPlacaPrefix } from "@/lib/placa-number";
import { getChannelCounts } from "@/lib/metrics";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const qrs = await prisma.qrCode.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { placaNumber: "asc" },
  });
  const counts = await getChannelCounts(qrs.map((q) => q.id));
  const data = qrs.map((q) => {
    const c = counts[q.id] ?? { qr: 0, nfc: 0, total: 0 };
    return {
      ...q,
      scansCount: c.total,
      qrScans: c.qr,
      nfcScans: c.nfc,
      qrUrl: q.placaNumber ? getQrUrlByNumber(q.placaNumber) : null,
      nfcUrl: q.placaNumber ? getNfcUrlByNumber(q.placaNumber) : null,
    };
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = qrCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let slug = parsed.data.slug?.trim().toLowerCase();
  if (!slug) slug = generateSlug();
  else {
    const err = validateSlug(slug);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  // check uniqueness
  const exists = await prisma.qrCode.findUnique({ where: { slug } });
  if (exists) return NextResponse.json({ error: "Slug já existe, escolha outro" }, { status: 409 });

  // Numeração global sequencial, nunca repete (mesmo se excluir).
  // Um único cadastro gera QR + NFC + destino (links /q/NNN e /n/NNN).
  const qr = await prisma.$transaction(async (tx: any) => {
    let counter = await tx.placaCounter.findUnique({ where: { id: "placa" } });
    if (!counter) {
      counter = await tx.placaCounter.create({ data: { id: "placa", next: 1 } });
    }
    const n: number = counter.next;
    await tx.placaCounter.update({ where: { id: "placa" }, data: { next: n + 1 } });
    return tx.qrCode.create({
      data: {
        userId: user.id,
        name: withPlacaPrefix(parsed.data.name, n),
        destinationUrl: parsed.data.destinationUrl,
        slug,
        placaNumber: n,
        fgColor: parsed.data.fgColor,
        bgColor: parsed.data.bgColor,
        margin: parsed.data.margin,
        size: parsed.data.size,
        errorLevel: parsed.data.errorLevel,
        transparentBg: parsed.data.transparentBg,
        qrStatus: parsed.data.qrStatus ?? parsed.data.status,
        nfcStatus: parsed.data.nfcStatus,
      },
    });
  });
  // Imagens ficam SÓ em disco local (banco vai todo pro Supabase).
  // Salva QR + placa na criação; best-effort: não falha o request se o disco falhar.
  try {
    const placaNum = (qr as any).placaNumber as number;
    const qrUrl = getQrUrlByNumber(placaNum);
    const qrBuffer = await generateQrPngBuffer(qrUrl, {
      fgColor: qr.fgColor,
      bgColor: qr.bgColor,
      margin: qr.margin,
      size: qr.size,
      errorLevel: qr.errorLevel as any,
      transparentBg: qr.transparentBg,
    });
    await saveQrPng(qr.id, qrBuffer);
    try {
      const placaBuffer = await composePlacaBuffer(qrUrl, placaNum);
      await savePlacaPng(placaNum, slug, placaBuffer);
    } catch (e) {
      // placa depende de template; QR já foi salvo
      console.error("[storage] falha ao salvar placa:", e);
    }
  } catch (e) {
    console.error("[storage] falha ao salvar PNGs locais:", e);
  }
  return NextResponse.json(
    {
      ...qr,
      qrUrl: qr.placaNumber ? getQrUrlByNumber(qr.placaNumber) : null,
      nfcUrl: qr.placaNumber ? getNfcUrlByNumber(qr.placaNumber) : null,
    },
    { status: 201 }
  );
}
