import { prisma } from "@/lib/prisma";

export type PlacaMetrics = {
  qr: number;
  nfc: number;
  total: number;
  byDay: { day: string; qr: number; nfc: number; total: number }[];
  lastAccess: { qr: string | null; nfc: string | null; overall: string | null };
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Métricas separadas por canal (QR / NFC) para uma placa. */
export async function getPlacaMetrics(qrCodeId: string): Promise<PlacaMetrics> {
  const scans = await prisma.scan.findMany({
    where: { qrCodeId },
    select: { channel: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let qr = 0;
  let nfc = 0;
  const days = new Map<string, { qr: number; nfc: number }>();
  let lastQr: Date | null = null;
  let lastNfc: Date | null = null;

  for (const s of scans) {
    const ch = (s as any).channel as string;
    const day = dayKey(s.createdAt);
    let entry = days.get(day);
    if (!entry) {
      entry = { qr: 0, nfc: 0 };
      days.set(day, entry);
    }
    if (ch === "NFC") {
      nfc++;
      entry.nfc++;
      if (!lastNfc || s.createdAt > lastNfc) lastNfc = s.createdAt;
    } else {
      qr++;
      entry.qr++;
      if (!lastQr || s.createdAt > lastQr) lastQr = s.createdAt;
    }
  }

  const byDay = [...days.entries()].map(([day, v]) => ({
    day,
    qr: v.qr,
    nfc: v.nfc,
    total: v.qr + v.nfc,
  }));

  const overall = lastQr && lastNfc ? (lastQr > lastNfc ? lastQr : lastNfc) : lastQr ?? lastNfc;

  return {
    qr,
    nfc,
    total: qr + nfc,
    byDay,
    lastAccess: {
      qr: lastQr?.toISOString() ?? null,
      nfc: lastNfc?.toISOString() ?? null,
      overall: overall?.toISOString() ?? null,
    },
  };
}

/** Contagem por canal para várias placas em 1 query (para listagens). */
export async function getChannelCounts(qrCodeIds: string[]): Promise<Record<string, { qr: number; nfc: number; total: number }>> {
  const out: Record<string, { qr: number; nfc: number; total: number }> = {};
  if (qrCodeIds.length === 0) return out;
  const groups = await prisma.scan.groupBy({
    by: ["qrCodeId", "channel"],
    where: { qrCodeId: { in: qrCodeIds } },
    _count: { _all: true },
  });
  for (const g of groups) {
    let entry = out[g.qrCodeId];
    if (!entry) {
      entry = { qr: 0, nfc: 0, total: 0 };
      out[g.qrCodeId] = entry;
    }
    const c = (g as any)._count._all as number;
    if ((g as any).channel === "NFC") entry.nfc += c;
    else entry.qr += c;
    entry.total += c;
  }
  return out;
}
