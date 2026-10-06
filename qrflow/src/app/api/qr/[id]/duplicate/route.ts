import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { generateSlug } from "@/lib/qr";
import { stripPlacaPrefix, withPlacaPrefix } from "@/lib/placa-number";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const qr = await prisma.qrCode.findFirst({ where: { id, userId: user.id, archivedAt: null } });
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const slug = generateSlug();
  const dup = await prisma.$transaction(async (tx: any) => {
    let counter = await tx.placaCounter.findUnique({ where: { id: "placa" } });
    if (!counter) {
      counter = await tx.placaCounter.create({ data: { id: "placa", next: 1 } });
    }
    const n: number = counter.next;
    await tx.placaCounter.update({ where: { id: "placa" }, data: { next: n + 1 } });
    const baseName = `${stripPlacaPrefix(qr.name)} (cópia)`;
    return tx.qrCode.create({
      data: {
        userId: user.id,
        name: withPlacaPrefix(baseName, n),
        slug,
        placaNumber: n,
        destinationUrl: qr.destinationUrl,
        fgColor: qr.fgColor,
        bgColor: qr.bgColor,
        margin: qr.margin,
        size: qr.size,
        errorLevel: qr.errorLevel,
        transparentBg: qr.transparentBg,
        qrStatus: "ACTIVE",
        nfcStatus: "ACTIVE",
      },
    });
  });
  return NextResponse.json(dup, { status: 201 });
}
