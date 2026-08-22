import { AGENT_SYSTEM, type ChatMessage } from "@/lib/agent";

export type QvacResult = {
  text: string;
  via: "sdk" | "http";
};

let modelId: string | null = null;
let loadError: string | null = null;

function historyFrom(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n");
  const rest = messages.filter((message) => message.role !== "system");
  const history: { role: "user" | "assistant"; content: string }[] = [];
  if (system) {
    const first = rest[0];
    if (first?.role === "user") {
      history.push({ role: "user", content: `${system}\n\n${first.content}` });
      for (const message of rest.slice(1)) {
        if (message.role === "user" || message.role === "assistant") {
          history.push({ role: message.role, content: message.content });
        }
      }
    } else {
      history.push({ role: "user", content: system });
    }
  } else {
    for (const message of rest) {
      if (message.role === "user" || message.role === "assistant") {
        history.push({ role: message.role, content: message.content });
      }
    }
  }
  return history;
}

async function completeViaHttp(messages: ChatMessage[]): Promise<QvacResult> {
  const base = process.env.QVAC_BASE_URL ?? "http://127.0.0.1:11434/v1";
  const model = process.env.QVAC_MODEL ?? "walinox";
  const timeoutMs = process.env.QVAC_BASE_URL ? 10_000 : 1_500;
  const response = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: AGENT_SYSTEM }, ...messages.filter((m) => m.role !== "system")],
      temperature: 0,
    }),
  });
  if (!response.ok) {
    throw new Error(`QVAC HTTP ${response.status}`);
  }
  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("QVAC HTTP returned an empty completion");
  }
  return { text, via: "http" };
}

async function completeViaSdk(messages: ChatMessage[]): Promise<QvacResult> {
  const { completion, loadModel, QWEN3_600M_INST_Q4 } = await import("@qvac/sdk");

  if (!modelId) {
    modelId = await loadModel({
      modelSrc: QWEN3_600M_INST_Q4,
      modelConfig: { ctx_size: 2048 },
    });
  }

  const final = await completion({
    modelId,
    history: historyFrom(messages),
    stream: false,
  }).final;
  const text = final.contentText || final.raw.fullText;
  if (!text.trim()) {
    throw new Error("QVAC SDK returned an empty completion");
  }
  return { text, via: "sdk" };
}

export function qvacLoadError(): string | null {
  return loadError;
}

export async function qvacComplete(messages: ChatMessage[]): Promise<QvacResult> {
  const attempts: Array<() => Promise<QvacResult>> = [() => completeViaHttp(messages)];
  if (process.env.QVAC_SDK === "1") {
    attempts.push(() => completeViaSdk(messages));
  }

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  loadError = errors.join(" | ");
  throw new Error(`QVAC unavailable: ${loadError}`);
}
