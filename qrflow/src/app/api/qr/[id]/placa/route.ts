import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQrDynamicUrl, getQrUrlByNumber } from "@/lib/qr";
import { composePlacaBuffer } from "@/lib/placa";
import { readPlacaPng, savePlacaPng } from "@/lib/storage";
import { formatPlacaNumber, withPlacaPrefix } from "@/lib/placa-number";

async function ensurePlacaNumber(qr: any) {
  if (qr.placaNumber) return qr;
  // lazy-assign para QRs antigos sem número
  return prisma.$transaction(async (tx: any) => {
    let counter = await tx.placaCounter.findUnique({ where: { id: "placa" } });
    if (!counter) counter = await tx.placaCounter.create({ data: { id: "placa", next: 1 } });
    const n: number = counter.next;
    await tx.placaCounter.update({ where: { id: "placa" }, data: { next: n + 1 } });
    return tx.qrCode.update({
      where: { id: qr.id },
      data: {
        placaNumber: n,
        name: withPlacaPrefix(qr.name, n),
        qrStatus: (qr as any).qrStatus ?? "ACTIVE",
        nfcStatus: (qr as any).nfcStatus ?? "ACTIVE",
      },
    });
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = await prisma.qrCode.findUnique({ where: { id } });
  if (!qr || (qr as any).archivedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const numbered = await ensurePlacaNumber(qr);
    // Placa pronta fica em disco local: lê o arquivo primeiro, gera + salva se não existir.
    if (numbered.placaNumber) {
      const cached = await readPlacaPng(numbered.placaNumber, numbered.slug);
      if (cached) {
        const numero = formatPlacaNumber(numbered.placaNumber);
        return new NextResponse(cached as any, {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="${numero}-${numbered.slug}-placa.png"`,
            "Cache-Control": "no-store",
          },
        });
      }
    }
    // QR impresso codifica a URL canônica /q/NNN (NFC usa /n/NNN, mesmo destino)
    const url = numbered.placaNumber
      ? getQrUrlByNumber(numbered.placaNumber)
      : getQrDynamicUrl(numbered.slug);
    const buffer = await composePlacaBuffer(url, numbered.placaNumber);
    // backfill em disco
    try {
      if (numbered.placaNumber) await savePlacaPng(numbered.placaNumber, numbered.slug, buffer);
    } catch (e) {
      console.error("[storage] falha ao salvar placa em disco:", e);
    }
    const numero = formatPlacaNumber(numbered.placaNumber);
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${numero}-${numbered.slug}-placa.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Falha ao gerar placa" }, { status: 500 });
  }
}
