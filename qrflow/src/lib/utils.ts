import { createHash } from "crypto";

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "default-salt";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);
}

export function getAnonVisitorId(req: Request): string {
  const ip = getIp(req);
  if (ip) return hashIp(ip).slice(0, 16);
  return createHash("sha256").update(Math.random().toString()).digest("hex").slice(0, 16);
}

export function getIp(req: Request): string | null {
  const headers = (req as any).headers as Headers;
  const forwarded = headers?.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers?.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

export function parseUserAgent(ua: string | null) {
  if (!ua) return { device: "unknown", browser: "unknown", os: "unknown" };
  const lower = ua.toLowerCase();
  let device = "desktop";
  if (/mobile|android|iphone/.test(lower)) device = "mobile";
  else if (/tablet|ipad/.test(lower)) device = "tablet";

  let browser = "other";
  if (lower.includes("edg")) browser = "Edge";
  else if (lower.includes("chrome")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari")) browser = "Safari";

  let os = "other";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os")) os = "macOS";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "iOS";
  else if (lower.includes("linux")) os = "Linux";

  return { device, browser, os };
}
