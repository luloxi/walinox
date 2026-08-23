import { getAddress } from "ethers";
import { buildPermit } from "@/lib/permit";
import { buildPermit2 } from "@/lib/permit2";
import { decodeEnvelope, encodeEnvelope, PAYLOAD_VERSION, type SignedEnvelope } from "@/lib/payload";

export const AIR_MAGIC = [0x57, 0x4c, 0x58, 0x31] as const;
export const AIR_UTF8 = 0;
export const AIR_ENVELOPE = 1;

export const FSK_BAUD = 200;
export const FSK_MARK = 1800;
export const FSK_SPACE = 1100;

export const BLE_SERVICE = "776c6e78-0001-1000-8000-00805f9b34fb";
export const BLE_CHAR = "776c6e78-0002-1000-8000-00805f9b34fb";
export const BLE_CHUNK = 160;

export const OPT_GRID = 6;
export const OPT_BYTES_PER_FRAME = 12;
export const OPT_PALETTE: [number, number, number][] = [
  [0, 0, 0],
  [255, 255, 255],
  [255, 0, 0],
  [0, 210, 0],
  [0, 70, 255],
  [255, 220, 0],
  [255, 0, 200],
  [0, 220, 255],
];

const PREAMBLE = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1];
const SYNC = [1, 1, 1, 1, 0, 0, 0, 0];

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u8(n: number): number {
  return n & 0xff;
}

function putU16(out: Uint8Array, offset: number, value: number): void {
  out[offset] = (value >> 8) & 0xff;
  out[offset + 1] = value & 0xff;
}

function getU16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function putU32(out: Uint8Array, offset: number, value: number): void {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

function getU32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0
  );
}

function hexToBytes(hex: string, length: number): Uint8Array {
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  const out = new Uint8Array(length);
  const n = Math.min(length, Math.floor(clean.length / 2));
  for (let i = 0; i < n; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(data: Uint8Array): string {
  return `0x${Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function addrToBytes(value: string): Uint8Array {
  return hexToBytes(getAddress(value), 20);
}

function bytesToAddr(data: Uint8Array): string {
  return getAddress(bytesToHex(data));
}

function u256ToBytes(value: string): Uint8Array {
  let n = BigInt(value);
  if (n < BigInt(0)) throw new Error("negative");
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & BigInt(0xff));
    n >>= BigInt(8);
  }
  if (n !== BigInt(0)) throw new Error("uint256 overflow");
  return out;
}

function bytesToU256(data: Uint8Array): string {
  let n = BigInt(0);
  for (const b of data) n = (n << BigInt(8)) | BigInt(b);
  return n.toString();
}

function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function utf8Decode(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

function looksLikeEnvelope(payload: string): boolean {
  try {
    const parsed = JSON.parse(payload) as { v?: unknown; kind?: unknown };
    return parsed?.v === PAYLOAD_VERSION && (parsed.kind === "permit2" || parsed.kind === "erc2612");
  } catch {
    return false;
  }
}

export function packEnvelope(envelope: SignedEnvelope): Uint8Array {
  const out = new Uint8Array(207);
  out[0] = envelope.kind === "permit2" ? 0 : 1;
  out.set(addrToBytes(envelope.owner), 1);
  out.set(addrToBytes(envelope.spender), 21);
  out.set(addrToBytes(envelope.token), 41);
  out.set(u256ToBytes(envelope.value), 61);
  out.set(u256ToBytes(String(envelope.typedData.message.nonce ?? "0")), 93);
  const deadline = BigInt(String(envelope.typedData.message.deadline ?? "0"));
  for (let i = 7; i >= 0; i--) {
    out[125 + i] = Number((deadline >> BigInt((7 - i) * 8)) & BigInt(0xff));
  }
  putU32(out, 133, envelope.typedData.domain.chainId);
  const sig = hexToBytes(envelope.signature, 65);
  out.set(sig, 137);
  return out;
}

export function unpackEnvelope(data: Uint8Array): SignedEnvelope {
  if (data.length < 207) throw new Error("Sobre aéreo corto");
  const kind = data[0] === 0 ? "permit2" : "erc2612";
  const owner = bytesToAddr(data.slice(1, 21));
  const spender = bytesToAddr(data.slice(21, 41));
  const token = bytesToAddr(data.slice(41, 61));
  const value = bytesToU256(data.slice(61, 93));
  const nonce = bytesToU256(data.slice(93, 125));
  let deadlineN = BigInt(0);
  for (let i = 0; i < 8; i++) deadlineN = (deadlineN << BigInt(8)) | BigInt(data[125 + i]);
  const deadline = deadlineN.toString();
  const chainId = getU32(data, 133);
  const signature = bytesToHex(data.slice(137, 202));
  if (kind === "permit2") {
    const typed = buildPermit2({ token, spender, amount: value, nonce, deadline, chainId });
    return {
      v: PAYLOAD_VERSION,
      kind,
      owner,
      spender: typed.message.spender,
      token: typed.message.permitted.token,
      value: typed.message.permitted.amount,
      typedData: {
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.message as unknown as Record<string, unknown>,
      },
      signature,
    };
  }
  const typed = buildPermit({
    domain: { name: "Tether USD", version: "1", chainId, verifyingContract: token },
    owner,
    spender,
    value,
    nonce,
    deadline,
  });
  return {
    v: PAYLOAD_VERSION,
    kind,
    owner: typed.message.owner,
    spender: typed.message.spender,
    token: typed.domain.verifyingContract,
    value: typed.message.value,
    typedData: {
      domain: typed.domain,
      types: typed.types,
      primaryType: typed.primaryType,
      message: typed.message,
    },
    signature,
  };
}

export function wrapAir(type: number, payload: Uint8Array): Uint8Array {
  if (payload.length > 0xffff) throw new Error("Payload aéreo demasiado grande");
  const body = new Uint8Array(3 + payload.length);
  body[0] = u8(type);
  putU16(body, 1, payload.length);
  body.set(payload, 3);
  const out = new Uint8Array(4 + body.length + 4);
  out.set(AIR_MAGIC, 0);
  out.set(body, 4);
  putU32(out, 4 + body.length, crc32(body));
  return out;
}

export function unwrapAir(packet: Uint8Array): { type: number; payload: Uint8Array } {
  if (packet.length < 11) throw new Error("Paquete aéreo corto");
  for (let i = 0; i < 4; i++) {
    if (packet[i] !== AIR_MAGIC[i]) throw new Error("Paquete aéreo inválido");
  }
  const type = packet[4];
  const len = getU16(packet, 5);
  const end = 7 + len;
  if (packet.length < end + 4) throw new Error("Paquete aéreo truncado");
  const body = packet.slice(4, end);
  if (getU32(packet, end) !== crc32(body)) throw new Error("CRC aéreo no coincide");
  return { type, payload: packet.slice(7, end) };
}

export function packAir(payload: string): Uint8Array {
  if (looksLikeEnvelope(payload)) {
    return wrapAir(AIR_ENVELOPE, packEnvelope(decodeEnvelope(payload)));
  }
  return wrapAir(AIR_UTF8, utf8Encode(payload));
}

export function unpackAir(packet: Uint8Array): string {
  const { type, payload } = unwrapAir(packet);
  if (type === AIR_ENVELOPE) return encodeEnvelope(unpackEnvelope(payload));
  if (type === AIR_UTF8) return utf8Decode(payload);
  throw new Error("Tipo aéreo desconocido");
}

function findPacket(bytes: Uint8Array): Uint8Array | null {
  for (let i = 0; i <= bytes.length - 11; i++) {
    if (
      bytes[i] === AIR_MAGIC[0] &&
      bytes[i + 1] === AIR_MAGIC[1] &&
      bytes[i + 2] === AIR_MAGIC[2] &&
      bytes[i + 3] === AIR_MAGIC[3]
    ) {
      try {
        const len = getU16(bytes, i + 5);
        const end = i + 7 + len + 4;
        if (end > bytes.length) continue;
        const slice = bytes.slice(i, end);
        unwrapAir(slice);
        return slice;
      } catch {
        /* keep scanning */
      }
    }
  }
  return null;
}

function byteBits(byte: number): number[] {
  const bits: number[] = [];
  for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  return bits;
}

function bitsToBytes(bits: number[], start: number, count: number): Uint8Array | null {
  if (start + count * 8 > bits.length) return null;
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    let v = 0;
    for (let b = 0; b < 8; b++) v = (v << 1) | bits[start + i * 8 + b];
    out[i] = v;
  }
  return out;
}

export function bitsForPacket(packet: Uint8Array): number[] {
  const bits = [...PREAMBLE, ...SYNC];
  for (const byte of packet) bits.push(...byteBits(byte));
  return bits;
}

function goertzel(samples: ArrayLike<number>, start: number, len: number, freq: number, sampleRate: number): number {
  const k = Math.round((len * freq) / sampleRate);
  const w = (2 * Math.PI * k) / len;
  const coeff = 2 * Math.cos(w);
  let q0 = 0;
  let q1 = 0;
  let q2 = 0;
  const end = start + len;
  for (let i = start; i < end; i++) {
    q0 = coeff * q1 - q2 + (samples[i] ?? 0);
    q2 = q1;
    q1 = q0;
  }
  return q1 * q1 + q2 * q2 - q1 * q2 * coeff;
}

export function modulateFsk(packet: Uint8Array, sampleRate: number): Float32Array {
  const spb = Math.max(8, Math.round(sampleRate / FSK_BAUD));
  const bits = bitsForPacket(packet);
  const pad = Math.round(sampleRate * 0.12);
  const out = new Float32Array(pad * 2 + bits.length * spb);
  let phase = 0;
  let o = pad;
  for (const bit of bits) {
    const freq = bit ? FSK_MARK : FSK_SPACE;
    const step = (2 * Math.PI * freq) / sampleRate;
    for (let i = 0; i < spb; i++) {
      out[o++] = Math.sin(phase) * 0.85;
      phase += step;
    }
  }
  return out;
}

function readBit(samples: ArrayLike<number>, start: number, spb: number, sampleRate: number): number {
  const inner = Math.max(4, Math.floor(spb * 0.7));
  const from = start + Math.floor((spb - inner) / 2);
  const mark = goertzel(samples, from, inner, FSK_MARK, sampleRate);
  const space = goertzel(samples, from, inner, FSK_SPACE, sampleRate);
  return mark > space ? 1 : 0;
}

function indexOfSeq(bits: number[], seq: number[]): number {
  outer: for (let i = 0; i <= bits.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (bits[i + j] !== seq[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function demodulateFsk(samples: ArrayLike<number>, sampleRate: number): Uint8Array | null {
  const spb = Math.max(8, Math.round(sampleRate / FSK_BAUD));
  if (samples.length < spb * (PREAMBLE.length + SYNC.length + 16)) return null;
  const step = Math.max(1, Math.floor(spb / 8));
  for (let offset = 0; offset < spb; offset += step) {
    const bits: number[] = [];
    for (let i = offset; i + spb <= samples.length; i += spb) {
      bits.push(readBit(samples, i, spb, sampleRate));
    }
    const syncAt = indexOfSeq(bits, [...PREAMBLE, ...SYNC]);
    if (syncAt < 0) continue;
    const dataBits = bits.slice(syncAt + PREAMBLE.length + SYNC.length);
    const header = bitsToBytes(dataBits, 0, 7);
    if (!header) continue;
    try {
      if (
        header[0] !== AIR_MAGIC[0] ||
        header[1] !== AIR_MAGIC[1] ||
        header[2] !== AIR_MAGIC[2] ||
        header[3] !== AIR_MAGIC[3]
      ) {
        continue;
      }
      const len = getU16(header, 5);
      const total = 7 + len + 4;
      const packet = bitsToBytes(dataBits, 0, total);
      if (!packet) continue;
      unwrapAir(packet);
      return packet;
    } catch {
      /* try next phase */
    }
  }
  return null;
}

export function bleChunks(packet: Uint8Array): Uint8Array[] {
  const total = Math.max(1, Math.ceil(packet.length / BLE_CHUNK));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < total; i++) {
    const slice = packet.subarray(i * BLE_CHUNK, (i + 1) * BLE_CHUNK);
    const chunk = new Uint8Array(2 + slice.length);
    chunk[0] = i;
    chunk[1] = total;
    chunk.set(slice, 2);
    chunks.push(chunk);
  }
  return chunks;
}

export function bleAssemble(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 0) throw new Error("Sin chunks Bluetooth");
  const ordered = [...chunks].sort((a, b) => a[0] - b[0]);
  const total = ordered[0][1];
  if (ordered.length !== total) throw new Error("Chunks Bluetooth incompletos");
  const parts: Uint8Array[] = [];
  let len = 0;
  for (let i = 0; i < total; i++) {
    const chunk = ordered[i];
    if (chunk[0] !== i || chunk[1] !== total) throw new Error("Chunks Bluetooth fuera de orden");
    const part = chunk.subarray(2);
    parts.push(part);
    len += part.length;
  }
  const out = new Uint8Array(len);
  let o = 0;
  for (const part of parts) {
    out.set(part, o);
    o += part.length;
  }
  return out;
}

const OPT_CELLS: [number, number][] = [];
for (let y = 0; y < OPT_GRID; y++) {
  for (let x = 0; x < OPT_GRID; x++) {
    const corner = (x === 0 || x === OPT_GRID - 1) && (y === 0 || y === OPT_GRID - 1);
    if (!corner) OPT_CELLS.push([x, y]);
  }
}

function setCorner(grid: number[][], x: number, y: number, color: number): void {
  grid[y][x] = color;
}

function emptyGrid(): number[][] {
  return Array.from({ length: OPT_GRID }, () => Array<number>(OPT_GRID).fill(0));
}

function frameToBytes(grid: number[][]): Uint8Array {
  const bits: number[] = [];
  for (const [x, y] of OPT_CELLS) {
    const color = grid[y][x] & 7;
    bits.push((color >> 2) & 1, (color >> 1) & 1, color & 1);
  }
  return bitsToBytes(bits, 0, OPT_BYTES_PER_FRAME) ?? new Uint8Array(OPT_BYTES_PER_FRAME);
}

function bytesToGrid(bytes: Uint8Array): number[][] {
  const grid = emptyGrid();
  setCorner(grid, 0, 0, 2);
  setCorner(grid, OPT_GRID - 1, 0, 3);
  setCorner(grid, 0, OPT_GRID - 1, 4);
  setCorner(grid, OPT_GRID - 1, OPT_GRID - 1, 5);
  const bits: number[] = [];
  for (const b of bytes) bits.push(...byteBits(b));
  while (bits.length < OPT_CELLS.length * 3) bits.push(0);
  for (let i = 0; i < OPT_CELLS.length; i++) {
    const [x, y] = OPT_CELLS[i];
    const o = i * 3;
    grid[y][x] = ((bits[o] << 2) | (bits[o + 1] << 1) | bits[o + 2]) & 7;
  }
  return grid;
}

export function opticalFrameCount(packetLength: number): number {
  const data = Math.max(0, packetLength);
  const first = OPT_BYTES_PER_FRAME - 8;
  if (data <= first) return 1;
  return 1 + Math.ceil((data - first) / (OPT_BYTES_PER_FRAME - 1));
}

export function opticalGrids(packet: Uint8Array): number[][][] {
  const total = opticalFrameCount(packet.length);
  if (total > 255) throw new Error("Demasiado largo para el canal de luz");
  const frames: number[][][] = [];
  const head = new Uint8Array(OPT_BYTES_PER_FRAME);
  head[0] = 0;
  head[1] = total;
  putU16(head, 2, packet.length);
  putU32(head, 4, crc32(packet));
  const first = OPT_BYTES_PER_FRAME - 8;
  head.set(packet.subarray(0, first), 8);
  frames.push(bytesToGrid(head));
  let offset = first;
  let index = 1;
  while (offset < packet.length) {
    const row = new Uint8Array(OPT_BYTES_PER_FRAME);
    row[0] = index;
    row.set(packet.subarray(offset, offset + OPT_BYTES_PER_FRAME - 1), 1);
    frames.push(bytesToGrid(row));
    offset += OPT_BYTES_PER_FRAME - 1;
    index += 1;
  }
  return frames;
}

export function nearestPalette(r: number, g: number, b: number): number {
  let best = 0;
  let dist = Infinity;
  for (let i = 0; i < OPT_PALETTE.length; i++) {
    const [pr, pg, pb] = OPT_PALETTE[i];
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < dist) {
      dist = d;
      best = i;
    }
  }
  return best;
}

type RgbBuf = { data: ArrayLike<number>; width: number; height: number };

function avgPatch(img: RgbBuf, cx: number, cy: number, radius = 2): [number, number, number] | null {
  const x0 = Math.max(0, Math.round(cx) - radius);
  const y0 = Math.max(0, Math.round(cy) - radius);
  const x1 = Math.min(img.width - 1, Math.round(cx) + radius);
  const y1 = Math.min(img.height - 1, Math.round(cy) + radius);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * img.width + x) * 4;
      r += img.data[i] ?? 0;
      g += img.data[i + 1] ?? 0;
      b += img.data[i + 2] ?? 0;
      n++;
    }
  }
  if (n === 0) return null;
  return [r / n, g / n, b / n];
}

function colorCentroid(
  img: RgbBuf,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  target: [number, number, number],
): { x: number; y: number } | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  const maxD = 90 * 90;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * img.width + x) * 4;
      const dr = (img.data[i] ?? 0) - target[0];
      const dg = (img.data[i + 1] ?? 0) - target[1];
      const db = (img.data[i + 2] ?? 0) - target[2];
      if (dr * dr + dg * dg + db * db <= maxD) {
        sx += x;
        sy += y;
        n++;
      }
    }
  }
  if (n < 8) return null;
  return { x: sx / n, y: sy / n };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sampleOpticalGrid(img: RgbBuf): number[][] | null {
  const { width: w, height: h } = img;
  if (w < 40 || h < 40) return null;
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);
  const tl = colorCentroid(img, 0, 0, midX, midY, OPT_PALETTE[2]);
  const tr = colorCentroid(img, midX, 0, w, midY, OPT_PALETTE[3]);
  const bl = colorCentroid(img, 0, midY, midX, h, OPT_PALETTE[4]);
  const br = colorCentroid(img, midX, midY, w, h, OPT_PALETTE[5]);
  if (!tl || !tr || !bl || !br) return null;
  const grid = emptyGrid();
  for (let y = 0; y < OPT_GRID; y++) {
    for (let x = 0; x < OPT_GRID; x++) {
      const u = x / (OPT_GRID - 1);
      const v = y / (OPT_GRID - 1);
      const px = lerp(lerp(tl.x, tr.x, u), lerp(bl.x, br.x, u), v);
      const py = lerp(lerp(tl.y, tr.y, u), lerp(bl.y, br.y, u), v);
      const rgb = avgPatch(img, px, py);
      if (!rgb) return null;
      grid[y][x] = nearestPalette(rgb[0], rgb[1], rgb[2]);
    }
  }
  if (grid[0][0] !== 2 || grid[0][OPT_GRID - 1] !== 3) return null;
  if (grid[OPT_GRID - 1][0] !== 4 || grid[OPT_GRID - 1][OPT_GRID - 1] !== 5) return null;
  return grid;
}

export function decodeOpticalGrid(grid: number[][]): { index: number; bytes: Uint8Array } {
  const bytes = frameToBytes(grid);
  return { index: bytes[0], bytes };
}

export type OpticalAssembler = {
  push(img: RgbBuf): Uint8Array | null;
  pushGrid(grid: number[][]): Uint8Array | null;
  reset(): void;
};

export function createOpticalAssembler(): OpticalAssembler {
  const parts = new Map<number, Uint8Array>();
  let total = 0;
  let length = 0;
  let expectCrc = 0;
  function reset(): void {
    parts.clear();
    total = 0;
    length = 0;
    expectCrc = 0;
  }
  function pushGrid(grid: number[][]): Uint8Array | null {
    const { index, bytes } = decodeOpticalGrid(grid);
    if (index === 0) {
      total = bytes[1];
      length = getU16(bytes, 2);
      expectCrc = getU32(bytes, 4);
      parts.set(0, bytes.subarray(8));
    } else {
      parts.set(index, bytes.subarray(1));
    }
    if (!total || parts.size < total) return null;
    const out = new Uint8Array(length);
    let o = 0;
    for (let i = 0; i < total; i++) {
      const part = parts.get(i);
      if (!part) return null;
      const take = Math.min(part.length, length - o);
      out.set(part.subarray(0, take), o);
      o += take;
      if (o >= length) break;
    }
    if (o < length) return null;
    if (crc32(out) !== expectCrc) {
      reset();
      return null;
    }
    try {
      unwrapAir(out);
    } catch {
      const found = findPacket(out);
      if (!found) {
        reset();
        return null;
      }
      reset();
      return found;
    }
    reset();
    return out;
  }
  return {
    reset,
    pushGrid,
    push(img) {
      const grid = sampleOpticalGrid(img);
      if (!grid) return null;
      return pushGrid(grid);
    },
  };
}

export function paintOpticalGrid(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  clock: boolean,
): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = clock ? "#e8e8e8" : "#141414";
  ctx.fillRect(0, 0, width, height);
  const pad = Math.min(width, height) * 0.12;
  const size = Math.min(width, height) - pad * 2;
  const x0 = (width - size) / 2;
  const y0 = (height - size) / 2;
  const cell = size / OPT_GRID;
  for (let y = 0; y < OPT_GRID; y++) {
    for (let x = 0; x < OPT_GRID; x++) {
      const [r, g, b] = OPT_PALETTE[grid[y][x] & 7];
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x0 + x * cell, y0 + y * cell, cell + 0.5, cell + 0.5);
    }
  }
}
