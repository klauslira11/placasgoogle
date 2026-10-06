export const APP_NAME = "QR Flow";
export const APP_TAGLINE = "QR Codes dinâmicos que você controla";
export const APP_DESCRIPTION =
  "Crie QR Codes dinâmicos, altere o destino sem reimprimir e acompanhe acessos em tempo real.";
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Palavras que não podem ser usadas como slug
export const RESERVED_SLUGS = [
  "api",
  "r",
  "q",
  "n",
  "admin",
  "dashboard",
  "login",
  "register",
  "cadastro",
  "recursos",
  "precos",
  "preços",
  "termos",
  "privacidade",
  "terms",
  "privacy",
  "forgot-password",
  "reset-password",
  "verificar",
  "verify",
  "auth",
  "trpc",
  "_next",
  "static",
  "public",
  "favicon",
];
