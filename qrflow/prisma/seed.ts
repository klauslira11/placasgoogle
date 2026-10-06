import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@qrflow.com";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        name: "Admin QR Flow",
        email: adminEmail,
        password: hash,
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
    console.log("Admin criado: admin@qrflow.com / admin123");
  } else {
    console.log("Admin já existe");
  }

  const userEmail = "demo@qrflow.com";
  const demo = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!demo) {
    const hash = await bcrypt.hash("demo1234", 12);
    await prisma.user.create({
      data: {
        name: "Demo User",
        email: userEmail,
        password: hash,
        role: "USER",
        emailVerified: new Date(),
      },
    });
    console.log("Demo criado: demo@qrflow.com / demo1234");
  }
}

async function seedDemoPlaca() {
  const demo = await prisma.user.findUnique({ where: { email: "demo@qrflow.com" } });
  if (!demo) return;
  const existing = await prisma.qrCode.findFirst({ where: { userId: demo.id } });
  if (existing) {
    console.log("Demo já tem placas, nada a criar");
    return;
  }
  const placa = await prisma.$transaction(async (tx: any) => {
    let counter = await tx.placaCounter.findUnique({ where: { id: "placa" } });
    if (!counter) counter = await tx.placaCounter.create({ data: { id: "placa", next: 1 } });
    const n: number = counter.next;
    await tx.placaCounter.update({ where: { id: "placa" }, data: { next: n + 1 } });
    return tx.qrCode.create({
      data: {
        userId: demo.id,
        name: `00${n} - Hamburgueria Exemplo`,
        slug: `demo-placa-${Date.now()}`,
        destinationUrl: "https://www.google.com/maps",
        placaNumber: n,
        qrStatus: "ACTIVE",
        nfcStatus: "ACTIVE",
      },
    });
  });
  await prisma.scan.createMany({
    data: [
      { qrCodeId: placa.id, channel: "QR" as any },
      { qrCodeId: placa.id, channel: "QR" as any },
      { qrCodeId: placa.id, channel: "NFC" as any },
    ],
  });
  console.log(`Placa demo criada: /q/00${placa.placaNumber} e /n/00${placa.placaNumber}`);
}

main()
  .then(() => seedDemoPlaca())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
