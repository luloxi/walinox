import { extractEnsName } from "@/lib/ens";
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

export type AgentTask = "send" | "contact" | "product";

export type AgentIntent = {
  task: AgentTask;
  to?: string;
  amount?: string;
  name?: string;
  title?: string;
  price?: string;
  place?: string;
  source: "model" | "heuristic";
};

export const INTENT_SYSTEM = `Convertí el pedido a JSON. Solo JSON, sin markdown, sin charla.
QVAC rellena campos del formulario, no es un chat ni la billetera.
Según task:
send: {"task":"send","to":"0x… o nombre.eth o nombre.base.eth","amount":"10"}
contact: {"task":"contact","name":"María","to":"0x… o nombre.eth"}
product: {"task":"product","title":"Café","price":"3","place":"San Martín 100"}
Reglas: USDT; amount y price en unidades humanas (10, no 10000000). Si falta un campo, omitilo.`;

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

export function toBaseUnits(amount: string, decimals = 6): string {
  const [whole, frac = ""] = amount.trim().split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const raw = `${whole.replace(/^0+/, "") || "0"}${fracPadded}`;
  return raw.replace(/^0+/, "") || "0";
}

function extractAmount(input: string): string | undefined {
  const spend = input.match(/spend\s+(\d+(?:\.\d+)?)/i);
  if (spend) return spend[1];
  const token = input.match(/(\d+(?:\.\d+)?)\s*USDT\b/i);
  if (token) return token[1];
  const es = input.match(
    /(?:mandale|mandá|manda|enviale|enviá|envia|enviar|transferí|transferir)\s+(\d+(?:\.\d+)?)/i,
  );
  if (es) return es[1];
  return undefined;
}

function extractAddress(input: string): string | undefined {
  return input.match(ADDRESS_RE)?.[0];
}

function extractRecipient(input: string): string | undefined {
  return extractAddress(input) ?? extractEnsName(input);
}

function humanAmount(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function parseAgentOutput(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Agent did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function normalizePermit(
  data: Record<string, unknown>,
  opts: { owner: string; input: string },
): Omit<AgentPermit, "source"> {
  const token = tokenFromInput(opts.input) ?? {
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  };
  const permit = (data.permit ?? {}) as Record<string, unknown>;
  const value = String(permit.value ?? data.value ?? "0");
  const owner = String(permit.owner ?? opts.owner);
  const spender = String(permit.spender ?? "0x000000000022D473030F116dDEE9F6B43aC78BA3");
  const typed = buildPermit2({
    owner,
    spender,
    value,
    nonce: String(permit.nonce ?? "0"),
    deadline: String(permit.deadline ?? Math.floor(Date.now() / 1000) + 3600),
  });
  return {
    kind: "permit2",
    token,
    owner,
    spender,
    value,
    typed,
    explanation: String(data.explanation ?? ""),
    complianceNote: String(data.complianceNote ?? ""),
  };
}

export async function heuristicComplete(messages: ChatMessage[]): Promise<string> {
  void messages;
  throw new Error("heuristicComplete is not a model");
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

function parseAgentIntent(data: Record<string, unknown>, task: AgentTask): Omit<AgentIntent, "source"> {
  const root = data;
  const permit = (data.permit as Record<string, unknown> | undefined) ?? undefined;
  const to =
    readString(root, "to") ??
    readString(root, "recipient") ??
    readString(root, "address") ??
    readString(root, "holder") ??
    (permit ? readString(permit, "spender") : undefined);
  const amount = readString(root, "amount") ?? humanAmount(permit ? readString(permit, "value") : undefined);
  const name = readString(root, "name");
  const title = readString(root, "title");
  const price = readString(root, "price") ?? (task === "product" ? amount : undefined);
  const place = readString(root, "place") ?? readString(root, "redemptionPlace");
  return { task, to, amount, name, title, price, place };
}

export function heuristicIntent(input: string, task: AgentTask): AgentIntent {
  if (task === "send") {
    const to = extractRecipient(input);
    if (!to) throw new Error("Poné un address 0x…, un ENS o un Basename");
    return { task: "send", to, amount: extractAmount(input), source: "heuristic" };
  }
  if (task === "contact") {
    const to = extractRecipient(input);
    if (!to) throw new Error("Poné un address 0x…, un ENS o un Basename");
    const name = input
      .replace(ADDRESS_RE, " ")
      .replace(to, " ")
      .replace(/guard[aá]r?/gi, " ")
      .replace(/agend[aá]r?/gi, " ")
      .replace(/\b(contacto|contact|nombre|llamada|llamado)\b/gi, " ")
      .replace(/\bse llama\b/gi, " ")
      .replace(/(?:^|\s)[aA]\s+/g, " ")
      .replace(/[.,;:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { task: "contact", to, name: name || undefined, source: "heuristic" };
  }
  const priceMatch = input.match(/(\d+(?:\.\d+)?)\s*(USDT)?/i);
  const placeMatch = input.match(/(?:retiro(?:\s+en)?|en)\s+(.+)$/i);
  let rest = input;
  if (priceMatch) rest = rest.replace(priceMatch[0], " ");
  if (placeMatch) rest = rest.replace(placeMatch[0], " ");
  rest = rest
    .replace(/\b(vendo|vendemos|producto|vale|public[aá]|un|una|a)\b/gi, " ")
    .replace(/[.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    task: "product",
    title: rest || undefined,
    price: priceMatch?.[1],
    place: placeMatch?.[1]?.replace(/[.,;]+$/, "").trim(),
    source: "heuristic",
  };
}

export async function naturalLanguageToIntent(
  input: string,
  opts: { task: AgentTask; owner?: string; complete: CompletionFn },
): Promise<AgentIntent> {
  const raw = await opts.complete([
    { role: "system", content: INTENT_SYSTEM },
    {
      role: "user",
      content: `task: ${opts.task}\n${opts.owner ? `owner: ${opts.owner}\n` : ""}pedido: ${input}`,
    },
  ]);
  return { ...parseAgentIntent(parseAgentOutput(raw), opts.task), source: "model" };
}
