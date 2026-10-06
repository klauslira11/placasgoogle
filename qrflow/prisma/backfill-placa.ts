import { PrismaClient } from "@prisma/client";
import { withPlacaPrefix } from "../src/lib/placa-number";

async function main() {
  const p = new PrismaClient();
  const qrs = await p.qrCode.findMany({ orderBy: { createdAt: "asc" } });
  console.log("total qrs:", qrs.length);
  let max = 0;
  for (const q of qrs) {
    const n = (q as any).placaNumber as number | null;
    if (n && n > max) max = n;
  }
  let next = max + 1;
  const semNumero = qrs.filter((q) => !(q as any).placaNumber);
  for (const q of semNumero) {
    const n = next++;
    await p.qrCode.update({
      where: { id: q.id },
      data: { placaNumber: n, name: withPlacaPrefix(q.name, n) },
    });
    console.log("atribuido", n, q.slug);
  }
  const counter = await (p as any).placaCounter.upsert({
    where: { id: "placa" },
    create: { id: "placa", next },
    update: {},
  });
  if (counter.next < next) {
    await (p as any).placaCounter.update({ where: { id: "placa" }, data: { next } });
  }
  const final = await (p as any).placaCounter.findUnique({ where: { id: "placa" } });
  console.log("counter next=", final?.next);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
