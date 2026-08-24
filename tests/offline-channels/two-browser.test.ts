import { describe, expect, it } from "vitest";
import { chromium } from "playwright";
import jsQR from "jsqr";
import { encodeEnvelopeQr } from "@/lib/envelope-pack";
import { decodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { payloadToDataUrl } from "@/lib/qr";
import { buildPermit2 } from "@/lib/permit2";

const p2 = buildPermit2({
  spender: "0x3333333333333333333333333333333333333333",
  amount: "2000000",
  nonce: "7",
  deadline: "2000000000",
});

const envelope: SignedEnvelope = {
  v: 1,
  kind: "permit2",
  owner: "0x2222222222222222222222222222222222222222",
  spender: p2.message.spender,
  token: p2.message.permitted.token,
  value: p2.message.permitted.amount,
  typedData: {
    domain: p2.domain,
    types: p2.types,
    primaryType: p2.primaryType,
    message: p2.message as unknown as Record<string, unknown>,
  },
  signature: `0x${"ab".repeat(65)}`,
};

describe("two-browser compact handover", () => {
  it("renders compact QR in one context and jsQR-scans it; copy and file in another", async () => {
    const compact = encodeEnvelopeQr(envelope);
    const dataUrl = await payloadToDataUrl(compact);
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const ctxA = await browser.newContext();
      const ctxB = await browser.newContext();
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      await pageA.setContent(
        `<html><body style="margin:0;background:#fff;padding:24px">
          <img id="qr" src="${dataUrl}" width="720" height="720" />
        </body></html>`,
      );
      const pixels = await pageA.evaluate(async () => {
        const img = document.getElementById("qr") as HTMLImageElement;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return { data: Array.from(image.data), width: image.width, height: image.height };
      });
      const hit = jsQR(Uint8ClampedArray.from(pixels.data), pixels.width, pixels.height, {
        inversionAttempts: "attemptBoth",
      });
      expect(hit?.data.startsWith("W1:")).toBe(true);
      expect(decodeEnvelope(hit!.data).value).toBe("2000000");

      await pageA.evaluate((text) => {
        const ta = document.createElement("textarea");
        ta.id = "copy";
        ta.value = text;
        document.body.appendChild(ta);
      }, compact);
      const copied = await pageA.locator("#copy").inputValue();
      await pageB.setContent(`<textarea id="t"></textarea><input id="f" type="file" />`);
      await pageB.evaluate((text) => {
        (document.getElementById("t") as HTMLTextAreaElement).value = text;
      }, copied);
      const pasted = await pageB.locator("#t").inputValue();
      expect(decodeEnvelope(pasted).signature).toBe(envelope.signature);

      await pageB.setInputFiles("#f", {
        name: "walinox-permit.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(compact, "utf8"),
      });
      const fileText = await pageB.evaluate(async () => {
        const input = document.getElementById("f") as HTMLInputElement;
        return input.files?.[0] ? input.files[0].text() : "";
      });
      expect(decodeEnvelope(fileText).spender).toBe(envelope.spender);
    } finally {
      await browser.close();
    }
  }, 60_000);
});
