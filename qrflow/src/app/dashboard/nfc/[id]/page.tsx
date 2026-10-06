import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import NfcDetailClient from "./NfcDetailClient";
import { getNfcUrlByNumber, getQrUrlByNumber } from "@/lib/qr";
import { getPlacaMetrics } from "@/lib/metrics";

export default async function NfcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.suspendedAt) redirect("/login");

  const { id } = await params;
  const qr = await prisma.qrCode.findFirst({ where: { id, userId: user.id, archivedAt: null } });
  if (!qr) notFound();

  const n = (qr as any).placaNumber as number | null;
  const metrics = await getPlacaMetrics(qr.id);

  return (
    <NfcDetailClient
      initial={{
        id: qr.id,
        code: n ? String(n).padStart(3, "0") : "—",
        client: qr.name.replace(/^\d{3,}\s*-\s*/, ""),
        fullName: qr.name,
        nfcUrl: n ? getNfcUrlByNumber(n) : "",
        qrUrl: n ? getQrUrlByNumber(n) : null,
        destinationUrl: qr.destinationUrl,
        nfcStatus: (qr as any).nfcStatus,
        qrStatus: (qr as any).qrStatus,
        createdAt: qr.createdAt.toISOString(),
        metrics,
      }}
    />
  );
}
