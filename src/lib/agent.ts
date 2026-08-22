import { buildPermit, type PermitTypedData } from "@/lib/permit";
import { buildPermit2, type Permit2TypedData } from "@/lib/permit2";
import { tokenFromInput, type PermitKind, type TokenInfo } from "@/lib/tokens";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type CompletionFn = (messages: ChatMessage[]) => Promise<string>;

export type AgentPermit = {
  kind: PermitKind;
  token: TokenInfo;
  owner: string;
  spender: string;
  value: string;
  typed: PermitTypedData | Permit2TypedData;
  explanation: string;
  complianceNote: string;
  source: "model" | "heuristic";
};

export const AGENT_SYSTEM = `You convert natural language into a signed-spend intent.
Reply with JSON only:
{
  "token": "USDT",
  "permit": { "owner": string, "spender": string, "value": string, "nonce": string, "deadline": string },
  "explanation": string,
  "complianceNote": string
}
Rules:
- Always USDT on Ethereum. The app signs Uniswap Permit2 (USDT has no ERC-2612).
- value/nonce/deadline are decimal integer strings (6 decimals; 100 tokens = "100000000").
- explanation: one short paragraph.`;

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

function extractAmount(input: string): string {
  const spend = input.match(/spend\s+(\d+(?:\.\d+)?)/i);
  if (spend) return spend[1];
  const token = input.match(/(\d+(?:\.\d+)?)\s*USDT\b/i);
  if (token) return token[1];
  return "100";
}

export function toBaseUnits(amount: string, decimals: number): string {
  const [wholeRaw, fracRaw = ""] = amount.trim().split(".");
  if (!/^\d+$/.test(wholeRaw) || (fracRaw && !/^\d+$/.test(fracRaw))) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  const combined = `${wholeRaw}${frac}`.replace(/^0+/, "");
  return combined.length === 0 ? "0" : combined;
}

export function parseAgentOutput(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Agent did not return JSON");
  }
  return JSON.parse(body.slice(start, end + 1));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Agent JSON must be an object");
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

export function normalizePermit(
  draft: unknown,
  defaults: { owner: string; input: string },
): Omit<AgentPermit, "source"> {
  const root = asRecord(draft);
  const permitRaw = asRecord(root.permit ?? root.message ?? root);
  const token = tokenFromInput(
    `${defaults.input} ${readString(root, "token") ?? ""} ${readString(asRecord(root.domain ?? {}), "name") ?? ""}`,
  );
  const owner = readString(permitRaw, "owner") ?? defaults.owner;
  const spender = readString(permitRaw, "spender") ?? "";
  const value = readString(permitRaw, "value") ?? "";
  const nonce = readString(permitRaw, "nonce");
  const deadline = readString(permitRaw, "deadline");

  if (token.permit === "permit2") {
    const typed = buildPermit2({
      token: token.address,
      spender,
      amount: value,
      nonce,
      deadline,
      chainId: token.chainId,
    });
    return {
      kind: "permit2",
      token,
      owner,
      spender: typed.message.spender,
      value: typed.message.permitted.amount,
      typed,
      explanation:
        readString(root, "explanation") ??
        `Permit2 lets ${typed.message.spender} pull ${typed.message.permitted.amount} ${token.symbol} from ${owner}.`,
      complianceNote:
        readString(root, "complianceNote") ??
        "USDT has no permit(). This EIP-712 signature is for Uniswap Permit2. Approve Permit2 once, then permitTransferFrom moves tokens.",
    };
  }

  const typed = buildPermit({
    domain: {
      name: token.name,
      version: token.version,
      chainId: token.chainId,
      verifyingContract: token.address,
    },
    owner,
    spender,
    value,
    nonce,
    deadline,
  });
  return {
    kind: "erc2612",
    token,
    owner: typed.message.owner,
    spender: typed.message.spender,
    value: typed.message.value,
    typed,
    explanation:
      readString(root, "explanation") ??
      `ERC-2612 permit lets ${typed.message.spender} spend ${typed.message.value} ${token.symbol} from ${typed.message.owner}.`,
    complianceNote:
      readString(root, "complianceNote") ??
      "EIP-712 signed an ERC-2612 Permit. permit() sets allowance. transferFrom moves tokens.",
  };
}

export function heuristicComplete(input: string, owner: string): string {
  const spender = input.match(ADDRESS_RE)?.[0];
  if (!spender) {
    throw new Error("Name a spender address (0x…) in the request");
  }
  const token = tokenFromInput(input);
  const amount = extractAmount(input);
  const value = toBaseUnits(amount, token.decimals);
  const deadline = String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
  return JSON.stringify({
    token: token.symbol,
    permit: { owner, spender, value, nonce: "0", deadline },
    explanation: `Allow ${spender} to spend ${amount} ${token.symbol} from ${owner} via ${token.permit === "permit2" ? "Permit2" : "ERC-2612"}.`,
    complianceNote:
      token.permit === "permit2"
        ? "USDT has no permit(). Sign Permit2, approve Permit2 once, then permitTransferFrom."
        : "EIP-712 signed an ERC-2612 Permit. permit() sets allowance. transferFrom moves tokens.",
  });
}

export async function naturalLanguageToPermit(
  input: string,
  opts: { owner: string; complete: CompletionFn },
): Promise<AgentPermit> {
  const raw = await opts.complete([
    { role: "system", content: AGENT_SYSTEM },
    { role: "user", content: `Owner: ${opts.owner}\nRequest: ${input}` },
  ]);
  return {
    ...normalizePermit(parseAgentOutput(raw), { owner: opts.owner, input }),
    source: "model",
  };
}
