import { amountUsdt, receiptFlow } from "@/lib/activity";
import { isTxHash } from "@/lib/etherscan";
import type { Receipt } from "@/lib/receipts";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SparkPoint = { at: number; usdt: number };

export function spark24h(
  receipts: Receipt[],
  me: string,
  nowUsdt: number,
  now = Date.now(),
): { points: SparkPoint[]; deltaUsdt: number } {
  const from = now - DAY_MS;
  const mine = me.toLowerCase();
  const events = receipts
    .filter((row) => {
      if (row.token.toUpperCase() === "VALE") return false;
      if (!isTxHash(row.signature)) return false;
      const t = new Date(row.at).getTime();
      if (!Number.isFinite(t) || t < from || t > now) return false;
      return receiptFlow(row, mine) !== "none";
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  let balance = nowUsdt;
  const points: SparkPoint[] = [{ at: now, usdt: balance }];
  for (const row of events) {
    const flow = receiptFlow(row, mine);
    const amt = amountUsdt(row.value);
    if (flow === "in") balance -= amt;
    else if (flow === "out") balance += amt;
    points.push({ at: new Date(row.at).getTime(), usdt: balance });
  }
  points.push({ at: from, usdt: balance });
  points.reverse();
  return { points, deltaUsdt: nowUsdt - points[0].usdt };
}

export function sparkPath(
  points: SparkPoint[],
  width: number,
  height: number,
  pad = 2,
): { line: string; area: string } {
  if (points.length === 0) {
    const y = height / 2;
    return {
      line: `M 0 ${y} L ${width} ${y}`,
      area: `M 0 ${height} L 0 ${y} L ${width} ${y} L ${width} ${height} Z`,
    };
  }
  const xs = points.map((p) => p.at);
  const ys = points.map((p) => p.usdt);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = maxY - minY;
  const innerH = height - pad * 2;
  const innerW = width - pad * 2;

  function xy(p: SparkPoint): { x: number; y: number } {
    const x = pad + ((p.at - minX) / spanX) * innerW;
    const y =
      spanY === 0
        ? height / 2
        : pad + innerH - ((p.usdt - minY) / spanY) * innerH;
    return { x, y };
  }

  const coords = points.map(xy);
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = `${line} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;
  return { line, area };
}
