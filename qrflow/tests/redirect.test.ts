import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

describe("QR redirect logic", () => {
  let slug = "test-redirect-" + Date.now();
  let qrId: string;

  beforeAll(async () => {
    let user = await prisma.user.findUnique({ where: { email: "test-redirect@qrflow.com" } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: "Test", email: "test-redirect@qrflow.com", password: await bcrypt.hash("pass12345", 10), role: "USER" },
      });
    }
    const qr = await prisma.qrCode.create({
      data: { userId: user.id, name: "Redirect Test", slug, destinationUrl: "https://example.com/first", qrStatus: "ACTIVE", nfcStatus: "ACTIVE" },
    });
    qrId = qr.id;
  });

  afterAll(async () => {
    await prisma.scan.deleteMany({ where: { qrCodeId: qrId } });
    await prisma.qrCode.deleteMany({ where: { id: qrId } });
  });

  it("finds qr by slug and would redirect 307", async () => {
    const qr = await prisma.qrCode.findUnique({ where: { slug } });
    expect(qr).not.toBeNull();
    expect(qr!.destinationUrl).toBe("https://example.com/first");
  });

  it("destination change is immediate without slug change", async () => {
    await prisma.qrCode.update({ where: { id: qrId }, data: { destinationUrl: "https://example.com/second" } });
    const updated = await prisma.qrCode.findUnique({ where: { slug } });
    expect(updated!.slug).toBe(slug);
    expect(updated!.destinationUrl).toBe("https://example.com/second");
  });

  it("paused qr should be detected", async () => {
    await prisma.qrCode.update({ where: { id: qrId }, data: { qrStatus: "PAUSED" } });
    const paused = await prisma.qrCode.findUnique({ where: { slug } });
    expect(paused!.qrStatus).toBe("PAUSED");
    // revert
    await prisma.qrCode.update({ where: { id: qrId }, data: { qrStatus: "ACTIVE" } });
  });
});
