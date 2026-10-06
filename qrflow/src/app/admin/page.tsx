import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") redirect("/dashboard");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, suspendedAt: true, createdAt: true, _count: { select: { qrCodes: true } } },
  });
  return <AdminClient users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), suspendedAt: u.suspendedAt?.toISOString() || null, qrCount: u._count.qrCodes }))} />;
}
