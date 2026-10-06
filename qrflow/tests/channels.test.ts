import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { parsePlacaCode } from "@/lib/redirect";
import { getNfcUrlByNumber, getQrUrlByNumber } from "@/lib/qr";
import { getChannelCounts, getPlacaMetrics } from "@/lib/metrics";

describe("Placa unificada (QR + NFC)", () => {
  const email = "test-channels@qrflow.com";
  const slug = "test-channel-" + Date.now();
  let qrId: string;
  let placaNumber: number;

  beforeAll(async () => {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: "Channels", email, password: await bcrypt.hash("pass12345", 10), role: "USER" },
      });
    }
    // numeração via counter (igual à API)
    const qr = await prisma.$transaction(async (tx: any) => {
      let counter = await tx.placaCounter.findUnique({ where: { id: "placa" } });
      if (!counter) counter = await tx.placaCounter.create({ data: { id: "placa", next: 1 } });
      const n: number = counter.next;
      await tx.placaCounter.update({ where: { id: "placa" }, data: { next: n + 1 } });
      return tx.qrCode.create({
        data: {
          userId: user.id,
          name: `001 - Channel Test`,
          slug,
          destinationUrl: "https://example.com/dest",
          placaNumber: n,
          qrStatus: "ACTIVE",
          nfcStatus: "ACTIVE",
        },
      });
    });
    qrId = qr.id;
    placaNumber = qr.placaNumber;

    // 2 acessos QR + 1 NFC
    await prisma.scan.createMany({
      data: [
        { qrCodeId: qrId, channel: "QR" },
        { qrCodeId: qrId, channel: "QR" },
        { qrCodeId: qrId, channel: "NFC" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.scan.deleteMany({ where: { qrCodeId: qrId } });
    await prisma.qrCode.deleteMany({ where: { id: qrId } });
    await prisma.user.deleteMany({ where: { email } });
  });

  it("gera URLs /q/NNN e /n/NNN a partir do número", () => {
    expect(getQrUrlByNumber(placaNumber)).toMatch(/\/q\/\d{3,}$/);
    expect(getNfcUrlByNumber(placaNumber)).toMatch(/\/n\/\d{3,}$/);
  });

  it("parseia códigos com zero à esquerda e rejeita inválidos", () => {
    expect(parsePlacaCode("001")).toBe(1);
    expect(parsePlacaCode(String(placaNumber).padStart(3, "0"))).toBe(placaNumber);
    expect(parsePlacaCode("abc")).toBeNull();
    expect(parsePlacaCode("0")).toBeNull();
    expect(parsePlacaCode("")).toBeNull();
  });

  it("resolve a placa pelo número (base do /q/ e /n/)", async () => {
    const row = await prisma.qrCode.findUnique({ where: { placaNumber } });
    expect(row?.id).toBe(qrId);
    expect(row?.destinationUrl).toBe("https://example.com/dest");
  });

  it("métricas separadas por canal", async () => {
    const m = await getPlacaMetrics(qrId);
    expect(m.qr).toBe(2);
    expect(m.nfc).toBe(1);
    expect(m.total).toBe(3);
    expect(m.lastAccess.overall).not.toBeNull();
  });

  it("contagem por canal em lote", async () => {
    const counts = await getChannelCounts([qrId]);
    expect(counts[qrId].qr).toBe(2);
    expect(counts[qrId].nfc).toBe(1);
    expect(counts[qrId].total).toBe(3);
  });

  it("pausa só-NFC não afeta o canal QR", async () => {
    await prisma.qrCode.update({ where: { id: qrId }, data: { nfcStatus: "PAUSED" } });
    const row = await prisma.qrCode.findUnique({ where: { id: qrId } });
    expect((row as any).nfcStatus).toBe("PAUSED");
    expect((row as any).qrStatus).toBe("ACTIVE");
    await prisma.qrCode.update({ where: { id: qrId }, data: { nfcStatus: "ACTIVE" } });
  });

  it("arquivamento lógico esconde da lista principal", async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.qrCode.update({ where: { id: qrId }, data: { archivedAt: new Date() } });
    const visible = await prisma.qrCode.findMany({ where: { userId: user!.id, archivedAt: null } });
    expect(visible.find((q) => q.id === qrId)).toBeUndefined();
    // reverte para o cleanup funcionar igual aos outros testes
    await prisma.qrCode.update({ where: { id: qrId }, data: { archivedAt: null } });
  });
});
