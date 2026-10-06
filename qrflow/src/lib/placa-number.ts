export function formatPlacaNumber(n: number): string {
  return String(n).padStart(3, "0");
}

export function stripPlacaPrefix(name: string): string {
  return name.replace(/^\d{3,}\s*-\s*/, "").trim();
}

export function withPlacaPrefix(name: string, n: number): string {
  const clean = stripPlacaPrefix(name);
  const base = clean || "Placa";
  const prefixed = `${formatPlacaNumber(n)} - ${base}`;
  // respeita limite de 80 chars do schema
  return prefixed.length > 80 ? prefixed.slice(0, 80) : prefixed;
}

export function hasPlacaPrefix(name: string): boolean {
  return /^\d{3,}\s*-\s*/.test(name);
}
