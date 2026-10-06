import { describe, it, expect } from "vitest";
import { formatPlacaNumber, withPlacaPrefix, stripPlacaPrefix } from "@/lib/placa-number";

describe("placa numbering", () => {
  it("formats 1->001, 999->999, 1000->1000", () => {
    expect(formatPlacaNumber(1)).toBe("001");
    expect(formatPlacaNumber(9)).toBe("009");
    expect(formatPlacaNumber(99)).toBe("099");
    expect(formatPlacaNumber(999)).toBe("999");
    expect(formatPlacaNumber(1000)).toBe("1000");
    expect(formatPlacaNumber(1001)).toBe("1001");
  });

  it("prefixes name once", () => {
    expect(withPlacaPrefix("Loja Centro", 1)).toBe("001 - Loja Centro");
    expect(withPlacaPrefix("001 - Loja Centro", 1)).toBe("001 - Loja Centro");
    expect(withPlacaPrefix("002 - Loja", 5)).toBe("005 - Loja");
    expect(stripPlacaPrefix("007 - Mercado")).toBe("Mercado");
  });
});
