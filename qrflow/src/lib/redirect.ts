import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashIp, getAnonVisitorId, parseUserAgent, getIp } from "@/lib/utils";
import { formatPlacaNumber } from "@/lib/placa-number";

export type AccessChannel = "QR" | "NFC";

/** "001" -> 1. Retorna null se o código não for numérico. */
export function parsePlacaCode(code: string): number | null {
  const c = decodeURIComponent(code).trim();
  if (!/^\d{1,6}$/.test(c)) return null;
  const n = parseInt(c, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function htmlPage(status: number, title: string, heading: string, text: string, accent: "slate" | "amber"): NextResponse {
  const colors =
    accent === "amber"
      ? "background:#fffbeb;color:#92400e"
      : "background:#f8fafc;color:#334155";
  return new NextResponse(
    `<!DOCTYPE html><html><head><title>${title} - QR Flow</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;${colors};text-align:center;padding:2rem}</style></head><body><div><h1>${heading}</h1><p>${text}</p><a href="/">Voltar ao início</a></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export function notFoundPage(channel: AccessChannel): NextResponse {
  const noun = channel === "NFC" ? "Link NFC" : "QR Code";
  return htmlPage(404, `${noun} não encontrado`, `${noun} não encontrado`, "O link que você tentou acessar não existe ou foi removido.", "slate");
}

export function pausedPage(channel: AccessChannel): NextResponse {
  if (channel === "NFC") {
    return htmlPage(503, "Temporariamente indisponível", "Link indisponível", "Este link está temporariamente indisponível. Tente novamente mais tarde.", "amber");
  }
  return htmlPage(503, "Temporariamente indisponível", "QR Code pausado", "Este QR Code está temporariamente indisponível. Tente novamente mais tarde.", "amber");
}

type PlacaRow = {
  id: string;
  destinationUrl: string;
  placaNumber: number | null;
  qrStatus: string;
  nfcStatus: string;
  archivedAt: Date | null;
};

function isPaused(row: PlacaRow, channel: AccessChannel): boolean {
  return channel === "NFC" ? row.nfcStatus === "PAUSED" : row.qrStatus === "PAUSED";
}

function logScan(req: NextRequest, qrCodeId: string, channel: AccessChannel): void {
  const url = new URL(req.url);
  const ua = req.headers.get("user-agent");
  const { device, browser, os } = parseUserAgent(ua);
  const referer = req.headers.get("referer");
  const ip = getIp(req);
  const country = (req as any).geo?.country || req.headers.get("x-vercel-ip-country") || null;
  // don't await to avoid delaying redirect
  prisma.scan
    .create({
      data: {
        qrCodeId,
        channel: channel as any,
        anonVisitorId: getAnonVisitorId(req),
        country,
        device,
        browser,
        os,
        referer: referer?.slice(0, 500) || null,
        utmSource: url.searchParams.get("utm_source"),
        utmMedium: url.searchParams.get("utm_medium"),
        utmCampaign: url.searchParams.get("utm_campaign"),
        ipHash: ip ? hashIp(ip) : null,
      },
    })
    .catch(() => {});
}

function redirectToDestination(req: NextRequest, destinationUrl: string): NextResponse {
  const url = new URL(req.url);
  let destination = destinationUrl;
  try {
    const destUrl = new URL(destination);
    url.searchParams.forEach((v, k) => {
      if (!destUrl.searchParams.has(k)) destUrl.searchParams.set(k, v);
    });
    destination = destUrl.toString();
  } catch {}
  const res = NextResponse.redirect(destination, 307);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

async function finish(req: NextRequest, row: PlacaRow | null, channel: AccessChannel): Promise<NextResponse> {
  if (!row || row.archivedAt) return notFoundPage(channel);
  if (isPaused(row, channel)) return pausedPage(channel);
  logScan(req, row.id, channel);
  return redirectToDestination(req, row.destinationUrl);
}

/** Acesso canônico por número da placa: /q/001 ou /n/001. */
export async function redirectByNumber(req: NextRequest, code: string, channel: AccessChannel): Promise<NextResponse> {
  const n = parsePlacaCode(code);
  if (n === null) return notFoundPage(channel);
  const row = await prisma.qrCode.findUnique({ where: { placaNumber: n } });
  return finish(req, row as PlacaRow | null, channel);
}

/** Rota legada por slug: /r/[slug] conta como acesso QR. */
export async function redirectBySlug(req: NextRequest, slug: string): Promise<NextResponse> {
  const row = await prisma.qrCode.findUnique({ where: { slug } });
  return finish(req, row as PlacaRow | null, "QR");
}

export function formatCode(n: number): string {
  return formatPlacaNumber(n);
}
