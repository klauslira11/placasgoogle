import { describe, it, expect } from "vitest";
import { isValidDestinationUrl, validateSlug, qrCreateSchema } from "@/lib/validators";

describe("URL validation", () => {
  it("accepts http and https", () => {
    expect(isValidDestinationUrl("https://example.com")).toBe(true);
    expect(isValidDestinationUrl("http://example.com/path?q=1")).toBe(true);
  });
  it("blocks dangerous protocols", () => {
    expect(isValidDestinationUrl("javascript:alert(1)")).toBe(false);
    expect(isValidDestinationUrl("data:text/html,hi")).toBe(false);
    expect(isValidDestinationUrl("file:///etc/passwd")).toBe(false);
    expect(isValidDestinationUrl("ftp://example.com")).toBe(false);
  });
  it("rejects invalid urls", () => {
    expect(isValidDestinationUrl("not-a-url")).toBe(false);
    expect(isValidDestinationUrl("")).toBe(false);
  });
});

describe("slug validation", () => {
  it("blocks reserved slugs", () => {
    expect(validateSlug("api")).toBeTruthy();
    expect(validateSlug("admin")).toBeTruthy();
    expect(validateSlug("r")).toBeTruthy();
  });
  it("validates format", () => {
    expect(validateSlug("ab")).toBeTruthy(); // too short
    expect(validateSlug("valid-slug-123")).toBeNull();
    expect(validateSlug("-invalid")).toBeTruthy();
    expect(validateSlug("InvalidCaps")).toBeTruthy();
  });
});

describe("qr schema", () => {
  it("rejects blocked destination", () => {
    const r = qrCreateSchema.safeParse({ name: "Test", destinationUrl: "javascript:alert(1)" });
    expect(r.success).toBe(false);
  });
  it("accepts valid payload", () => {
    const r = qrCreateSchema.safeParse({ name: "Meu QR", destinationUrl: "https://google.com", size: 1000 });
    expect(r.success).toBe(true);
  });
});
