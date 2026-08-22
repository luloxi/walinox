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

export function heuristicIntent(input: string, task: AgentTask): AgentIntent {
  const amount = humanAmount(extractAmount(input));
  const to = extractRecipient(input);
  if (task === "send") {
    return { task, to, amount, source: "heuristic" };
  }
  if (task === "contact") {
    const nameMatch = input.match(/(?:contacto|contact|nombre|llam[aeo])\s+([\w\s.]+)/i);
    const name = nameMatch?.[1]?.trim();
    return { task, name, to, source: "heuristic" };
  }
  const titleMatch = input.match(/(?:producto|title|título|titulo|café|cafe|pan)\s*[:\s]?([\w\s]+)/i);
  const price = humanAmount(extractAmount(input));
  return {
    task: "product",
    title: titleMatch?.[1]?.trim(),
    price,
    source: "heuristic",
  };
}

function parseAgentOutput(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Agent did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
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

export async function completePermit(
  complete: CompletionFn,
  opts: { owner: string; input: string },
): Promise<AgentPermit> {
  const raw = await complete([
    { role: "system", content: AGENT_SYSTEM },
    { role: "user", content: `Owner: ${opts.owner}\nRequest: ${opts.input}` },
  ]);
  return {
    ...normalizePermit(parseAgentOutput(raw), { owner: opts.owner, input: opts.input }),
    source: "model",
  };
}

export async function completeIntent(
  complete: CompletionFn,
  opts: { prompt: string; task: AgentTask; owner?: string },
): Promise<AgentIntent> {
  const raw = await complete([
    { role: "system", content: INTENT_SYSTEM },
    {
      role: "user",
      content: opts.owner
        ? `task=${opts.task}\nowner=${opts.owner}\n${opts.prompt}`
        : `task=${opts.task}\n${opts.prompt}`,
    },
  ]);
  try {
    const data = parseAgentOutput(raw) as Partial<AgentIntent>;
    return {
      task: opts.task,
      to: typeof data.to === "string" ? data.to : undefined,
      amount: typeof data.amount === "string" ? data.amount : undefined,
      name: typeof data.name === "string" ? data.name : undefined,
      title: typeof data.title === "string" ? data.title : undefined,
      price: typeof data.price === "string" ? data.price : undefined,
      place: typeof data.place === "string" ? data.place : undefined,
      source: "model",
    };
  } catch {
    return heuristicIntent(opts.prompt, opts.task);
  }
}
