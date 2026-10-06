import { z } from "zod";
import { RESERVED_SLUGS } from "@/config/app";

export const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "ftp:"];

export function isValidDestinationUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (BLOCKED_PROTOCOLS.some((p) => url.toLowerCase().startsWith(p))) return false;
    return true;
  } catch {
    return false;
  }
}

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(80),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const qrCreateSchema = z.object({
  name: z.string().min(2).max(80),
  destinationUrl: z.string().refine(isValidDestinationUrl, {
    message: "URL deve ser http:// ou https:// válida (bloqueados: javascript:, data:, file:, ftp:)",
  }),
  slug: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífen")
    .optional()
    .or(z.literal("")),
  fgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").default("#000000"),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").default("#ffffff"),
  margin: z.coerce.number().min(0).max(10).default(4),
  size: z.coerce.number().min(200).max(2000).default(1000),
  errorLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
  transparentBg: z.boolean().default(false),
  status: z.enum(["ACTIVE", "PAUSED"]).default("ACTIVE"),
  qrStatus: z.enum(["ACTIVE", "PAUSED"]).default("ACTIVE"),
  nfcStatus: z.enum(["ACTIVE", "PAUSED"]).default("ACTIVE"),
});

export const qrUpdateSchema = qrCreateSchema.partial().extend({
  name: z.string().min(2).max(80).optional(),
  destinationUrl: z
    .string()
    .refine(isValidDestinationUrl, { message: "URL inválida" })
    .optional(),
  archived: z.boolean().optional(),
});

export function validateSlug(slug: string): string | null {
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) return "Slug reservado pelo sistema";
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return "Slug deve ter 3-40 caracteres (a-z, 0-9, hífen)";
  if (slug.startsWith("-") || slug.endsWith("-")) return "Slug não pode começar ou terminar com hífen";
  return null;
}
