import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { getPlacaMetrics } from "@/lib/metrics";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const qr = await prisma.qrCode.findFirst({
    where: { id, userId: user.id, archivedAt: null },
    select: { id: true, placaNumber: true, name: true },
  });
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const metrics = await getPlacaMetrics(id);
  return NextResponse.json({ id: qr.id, placaNumber: qr.placaNumber, name: qr.name, metrics });
}
