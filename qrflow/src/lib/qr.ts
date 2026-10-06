import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { formatPlacaNumber } from "./placa-number";

export function generateSlug(custom?: string): string {
  if (custom && custom.trim()) return custom.trim().toLowerCase();
  return nanoid(6).toLowerCase();
}

export async function generateQrPngBuffer(
  text: string,
  opts: {
    fgColor: string;
    bgColor: string;
    margin: number;
    size: number;
    errorLevel: "L" | "M" | "Q" | "H";
    transparentBg: boolean;
  }
): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(text, {
    errorCorrectionLevel: opts.errorLevel,
    margin: opts.margin,
    width: opts.size,
    color: {
      dark: opts.fgColor,
      light: opts.transparentBg ? "#00000000" : opts.bgColor,
    },
    type: "png",
  });
  return Buffer.from(buffer);
}

export function getQrDynamicUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/r/${slug}`;
}

function appBase(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return base.replace(/\/$/, "");
}

/** URL canônica do QR pela numeração da placa: /q/001 */
export function getQrUrlByNumber(n: number): string {
  return `${appBase()}/q/${formatPlacaNumber(n)}`;
}

/** URL permanente da NFC pela numeração da placa: /n/001 */
export function getNfcUrlByNumber(n: number): string {
  return `${appBase()}/n/${formatPlacaNumber(n)}`;
}
