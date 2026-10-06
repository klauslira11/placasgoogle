import { prisma } from "./src/lib/prisma";

const u = await prisma.user.count();
const q = await prisma.qrCode.count();
console.log(`SUPABASE OK users=${u} qrcodes=${q}`);
await prisma.$disconnect();
