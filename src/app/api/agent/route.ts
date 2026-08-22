import { NextResponse } from "next/server";
import {
  heuristicComplete,
  naturalLanguageToPermit,
  parseAgentOutput,
} from "@/lib/agent";
import { qvacComplete, qvacLoadError } from "@/lib/qvac";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string; owner?: string };
  const prompt = body.prompt?.trim();
  const owner = body.owner?.trim();

  if (!prompt || !owner) {
    return NextResponse.json({ error: "prompt and owner are required" }, { status: 400 });
  }

  try {
    const permit = await naturalLanguageToPermit(prompt, {
      owner,
      complete: async (messages) => {
        const result = await qvacComplete(messages);
        parseAgentOutput(result.text);
        return result.text;
      },
    });
    return NextResponse.json({ ...permit, qvac: true, qvacError: qvacLoadError() });
  } catch (error) {
    try {
      const fallback = await naturalLanguageToPermit(prompt, {
        owner,
        complete: async () => heuristicComplete(prompt, owner),
      });
      return NextResponse.json({
        ...fallback,
        qvac: false,
        qvacError: error instanceof Error ? error.message : String(error),
        source: "heuristic",
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: fallbackError instanceof Error ? fallbackError.message : "Agent failed" },
        { status: 400 },
      );
    }
  }
}
