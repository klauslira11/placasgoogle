import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NfcsClient from "./NfcsClient";
import { getChannelCounts } from "@/lib/metrics";
import { getNfcUrlByNumber } from "@/lib/qr";

export default async function NfcsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.suspendedAt) redirect("/login");

  const qrs = await prisma.qrCode.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { placaNumber: "asc" },
  });
  const counts = await getChannelCounts(qrs.map((q) => q.id));

  return (
    <NfcsClient
      initial={qrs.map((q) => {
        const c = counts[q.id] ?? { qr: 0, nfc: 0, total: 0 };
        const n = (q as any).placaNumber as number | null;
        return {
          id: q.id,
          code: n ? String(n).padStart(3, "0") : "—",
          client: q.name.replace(/^\d{3,}\s*-\s*/, ""),
          destinationUrl: q.destinationUrl,
          nfcUrl: n ? getNfcUrlByNumber(n) : "",
          nfcStatus: (q as any).nfcStatus,
          nfcScans: c.nfc,
          totalScans: c.total,
          createdAt: q.createdAt.toISOString(),
        };
      })}
    />
  );
}
