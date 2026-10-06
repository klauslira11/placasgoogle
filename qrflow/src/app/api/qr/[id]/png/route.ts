import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateQrPngBuffer, getQrDynamicUrl, getQrUrlByNumber } from "@/lib/qr";
import { readQrPng, saveQrPng } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = await prisma.qrCode.findUnique({ where: { id } });
  if (!qr || (qr as any).archivedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // allow public download? require ownership check via session or allow anonymous if not sensitive?
  // We keep it open but mitigate via not exposing private data; still enforce? We'll allow anyone with id to download?
  // For simplicity, allow public (id is guessable but cuid). Better check if needed: we skip auth for download via share.
  // PNGs ficam em disco local: lê o arquivo primeiro, gera + salva se não existir (backfill).
  const cached = await readQrPng(id);
  if (cached) {
    return new NextResponse(cached as any, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${qr.slug}.png"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const url = (qr as any).placaNumber
    ? getQrUrlByNumber((qr as any).placaNumber)
    : getQrDynamicUrl(qr.slug);
  const buffer = await generateQrPngBuffer(url, {
    fgColor: qr.fgColor,
    bgColor: qr.bgColor,
    margin: qr.margin,
    size: qr.size,
    errorLevel: qr.errorLevel as any,
    transparentBg: qr.transparentBg,
  });
  // backfill: salva para próximos downloads lerem do disco
  try {
    await saveQrPng(id, buffer);
  } catch (e) {
    console.error("[storage] falha ao salvar QR em disco:", e);
  }

  const filename = `${qr.slug}.png`;
  return new NextResponse(buffer as any, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
