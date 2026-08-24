import { tryDecodeCompactQr } from "@/lib/envelope-pack";
import { PAYLOAD_VERSION } from "@/lib/payload";

export function looksLikeAirEnvelope(payload: string): boolean {
  if (tryDecodeCompactQr(payload)) return true;
  try {
    const parsed = JSON.parse(payload) as { v?: unknown; kind?: unknown };
    return parsed?.v === PAYLOAD_VERSION && (parsed.kind === "permit2" || parsed.kind === "erc2612");
  } catch {
    return false;
  }
}
