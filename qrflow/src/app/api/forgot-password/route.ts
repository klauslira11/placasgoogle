import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  // always return success to avoid enumeration
  if (!user) return NextResponse.json({ ok: true });
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });
  // In production, send email. For now, log:
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  console.log(`[QR Flow] Reset link for ${email}: ${resetUrl}`);
  // Return token in dev for testing convenience
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, token, resetUrl });
  }
  return NextResponse.json({ ok: true });
}
