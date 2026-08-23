import { NextResponse } from "next/server";
import { heuristicIntent, naturalLanguageToIntent, parseAgentOutput, type AgentTask } from "@/lib/agent";
import { qvacComplete, qvacLoadError } from "@/lib/qvac";

export const runtime = "nodejs";

const TASKS = new Set<AgentTask>(["send", "contact", "product"]);

export async function POST(request: Request) {
  const body = (await request.json()) as {
    prompt?: string;
    owner?: string;
    task?: string;
  };
  const prompt = body.prompt?.trim();
  const owner = body.owner?.trim() ?? "";
  const task: AgentTask = TASKS.has(body.task as AgentTask) ? (body.task as AgentTask) : "send";

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const complete = async (messages: Parameters<typeof qvacComplete>[0]) => {
    const result = await qvacComplete(messages);
    parseAgentOutput(result.text);
    return result.text;
  };

  try {
    const intent = await naturalLanguageToIntent(prompt, { task, owner, complete });
    return NextResponse.json({ ...intent, qvac: true, qvacError: qvacLoadError() });
  } catch (error) {
    try {
      const fallback = heuristicIntent(prompt, task);
      return NextResponse.json({
        ...fallback,
        qvac: false,
        qvacError: error instanceof Error ? error.message : String(error),
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: fallbackError instanceof Error ? fallbackError.message : "Agent failed" },
        { status: 400 },
      );
    }
  }
}
