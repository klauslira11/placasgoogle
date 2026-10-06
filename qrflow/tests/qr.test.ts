import { describe, it, expect } from "vitest";
import { generateQrPngBuffer, getQrDynamicUrl } from "@/lib/qr";
import jsQR from "jsqr";
import Jimp from "jimp";

describe("QR generation - dynamic URL", () => {
  it("encodes dynamic URL, not destination", async () => {
    const slug = "abc123";
    const dynamicUrl = getQrDynamicUrl(slug);
    expect(dynamicUrl).toContain("/r/abc123");
    expect(dynamicUrl).not.toContain("https://destino.com");

    const buf = await generateQrPngBuffer(dynamicUrl, {
      fgColor: "#000000",
      bgColor: "#ffffff",
      margin: 4,
      size: 1000,
      errorLevel: "M",
      transparentBg: false,
    });
    expect(buf.length).toBeGreaterThan(1000);
    // PNG header
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

    // decode to verify content is dynamicUrl
    const image = await Jimp.read(buf);
    const { data, width, height } = image.bitmap;
    const clamped = new Uint8ClampedArray(data);
    const decoded = jsQR(clamped, width, height);
    expect(decoded).not.toBeNull();
    expect(decoded!.data).toBe(dynamicUrl);
    // ensure not destination
    expect(decoded!.data).not.toBe("https://destino.com");
  });

  it("generates transparent bg still scannable", async () => {
    const url = getQrDynamicUrl("test99");
    const buf = await generateQrPngBuffer(url, {
      fgColor: "#ff0000",
      bgColor: "#ffffff",
      margin: 2,
      size: 1000,
      errorLevel: "Q",
      transparentBg: true,
    });
    const image = await Jimp.read(buf);
    const { data, width, height } = image.bitmap;
    const decoded = jsQR(new Uint8ClampedArray(data), width, height);
    expect(decoded?.data).toBe(url);
  });
});
