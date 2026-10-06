import fs from "node:fs/promises";
import path from "node:path";

/** Pasta base dos PNGs locais. Tudo do banco vai pro Supabase; só imagens ficam aqui. */
export function storageBaseDir(): string {
  const configured = process.env.STORAGE_DIR?.trim() || "./storage";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

export function qrPngPath(id: string): string {
  return path.join(storageBaseDir(), "qr", `${id}.png`);
}

export function placaPngPath(placaNumber: number | string, slug: string): string {
  const safeSlug = String(slug).replace(/[^a-z0-9-_]/gi, "_");
  return path.join(storageBaseDir(), "placas", `${placaNumber}-${safeSlug}-placa.png`);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveQrPng(id: string, buffer: Buffer): Promise<string> {
  const file = qrPngPath(id);
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, buffer);
  return file;
}

export async function savePlacaPng(
  placaNumber: number | string,
  slug: string,
  buffer: Buffer
): Promise<string> {
  const file = placaPngPath(placaNumber, slug);
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, buffer);
  return file;
}

export async function readQrPng(id: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(qrPngPath(id));
  } catch {
    return null;
  }
}

export async function readPlacaPng(
  placaNumber: number | string,
  slug: string
): Promise<Buffer | null> {
  try {
    return await fs.readFile(placaPngPath(placaNumber, slug));
  } catch {
    return null;
  }
}
