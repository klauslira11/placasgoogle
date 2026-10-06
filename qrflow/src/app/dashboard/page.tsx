import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { getChannelCounts } from "@/lib/metrics";
import { getNfcUrlByNumber, getQrUrlByNumber } from "@/lib/qr";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.suspendedAt) redirect("/login");

  const qrs = await prisma.qrCode.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { placaNumber: "asc" },
  });
  const counts = await getChannelCounts(qrs.map((q) => q.id));

  const total = qrs.length;
  const active = qrs.filter((q) => (q as any).qrStatus === "ACTIVE").length;
  const paused = total - active;

  return (
    <DashboardClient
      qrs={qrs.map((q) => {
        const c = counts[q.id] ?? { qr: 0, nfc: 0, total: 0 };
        return {
          id: q.id,
          name: q.name,
          slug: q.slug,
          placaNumber: (q as any).placaNumber ?? null,
          destinationUrl: q.destinationUrl,
          status: (q as any).qrStatus,
          qrStatus: (q as any).qrStatus,
          nfcStatus: (q as any).nfcStatus,
          qrUrl: (q as any).placaNumber ? getQrUrlByNumber((q as any).placaNumber) : null,
          nfcUrl: (q as any).placaNumber ? getNfcUrlByNumber((q as any).placaNumber) : null,
          qrScans: c.qr,
          nfcScans: c.nfc,
          scansCount: c.total,
          fgColor: q.fgColor,
          bgColor: q.bgColor,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        };
      })}
      stats={{ total, active, paused }}
      userName={user.name}
    />
  );
}
