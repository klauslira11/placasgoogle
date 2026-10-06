import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") || "";
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspendedAt: true,
      createdAt: true,
      _count: { select: { qrCodes: true } },
    },
  });
  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, action } = await req.json();
  if (!userId || !["suspend", "reactivate"].includes(action)) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  if (userId === admin.id) return NextResponse.json({ error: "Não pode alterar a si mesmo" }, { status: 400 });
  const data = action === "suspend" ? { suspendedAt: new Date() } : { suspendedAt: null };
  const user = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json(user);
}
