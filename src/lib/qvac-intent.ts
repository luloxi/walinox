import {
  heuristicIntent,
  naturalLanguageToIntent,
  type AgentIntent,
  type AgentTask,
  type CompletionFn,
} from "@/lib/agent";

export type ResolveFormIntentInput = {
  prompt: string;
  task: AgentTask;
  owner?: string;
  deviceReady: boolean;
  completeOnDevice?: CompletionFn;
  fetchApi?: (body: { prompt: string; owner?: string; task: AgentTask }) => Promise<AgentIntent | null>;
};

/**
 * En una frase: on-device model if ready → /api/agent if online → heuristicIntent.
 * Never treats a failed load as a successful model.
 */
export async function resolveFormIntent(input: ResolveFormIntentInput): Promise<AgentIntent> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Escribí una frase");

  if (input.deviceReady && input.completeOnDevice) {
    try {
      return await naturalLanguageToIntent(prompt, {
        task: input.task,
        owner: input.owner,
        complete: input.completeOnDevice,
      });
    } catch {
      /* real on-device inference failed — fall through */
    }
  }

  if (input.fetchApi) {
    try {
      const intent = await input.fetchApi({ prompt, owner: input.owner, task: input.task });
      if (intent && intent.task) return intent;
    } catch {
      /* offline / no QVAC HTTP */
    }
  }

  return heuristicIntent(prompt, input.task);
}

export async function fetchAgentIntent(body: {
  prompt: string;
  owner?: string;
  task: AgentTask;
}): Promise<AgentIntent | null> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = (await res.json()) as AgentIntent & { error?: string };
  if (!res.ok || data.error) return null;
  return data;
}
