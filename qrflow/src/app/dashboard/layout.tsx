import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Sidebar from "./Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.suspendedAt) redirect("/login");

  return (
    <div className="min-h-screen bg-[#020208] text-slate-100 relative overflow-hidden">
      {/* Futuristic background */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-blue-800/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-stretch">
        <Sidebar userName={user.name} />
        <main className="flex-1 min-w-0 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
