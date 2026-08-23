import QRCode from "qrcode";
import jsQR from "jsqr";

const SCALE = 8;
const QUIET = 4;

export async function payloadToDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 560,
    color: { dark: "#111111", light: "#ffffff" },
  });
}

export function payloadToMatrix(payload: string): boolean[][] {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const matrix: boolean[][] = [];
  for (let y = 0; y < size; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x += 1) {
      row.push(Boolean(qr.modules.get(x, y)));
    }
    matrix.push(row);
  }
  return matrix;
}

export function matrixToImageData(matrix: boolean[][]): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const modules = matrix.length;
  const width = (modules + QUIET * 2) * SCALE;
  const height = width;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      if (!matrix[y][x]) continue;
      const startX = (x + QUIET) * SCALE;
      const startY = (y + QUIET) * SCALE;
      for (let dy = 0; dy < SCALE; dy += 1) {
        for (let dx = 0; dx < SCALE; dx += 1) {
          const idx = ((startY + dy) * width + (startX + dx)) * 4;
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
      }
    }
  }

  return { data, width, height };
}

export function decodeQrPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  const result = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return result?.data ?? null;
}

export function roundTripQrPayload(payload: string): string {
  const image = matrixToImageData(payloadToMatrix(payload));
  const decoded = decodeQrPixels(image.data, image.width, image.height);
  if (decoded === null) {
    throw new Error("QR decode failed");
  }
  return decoded;
}
