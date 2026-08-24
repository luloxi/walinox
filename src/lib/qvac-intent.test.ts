import { describe, expect, it, vi } from "vitest";
import { resolveFormIntent } from "@/lib/qvac-intent";

const TO = "0x3333333333333333333333333333333333333333";

describe("En una frase fallback order", () => {
  it("uses on-device completion when the model is actually ready", async () => {
    const completeOnDevice = vi.fn(async () => JSON.stringify({ task: "send", to: TO, amount: "7" }));
    const fetchApi = vi.fn(async () => {
      throw new Error("should not hit /api/agent");
    });
    const intent = await resolveFormIntent({
      prompt: "mandale 7",
      task: "send",
      deviceReady: true,
      completeOnDevice,
      fetchApi,
    });
    expect(completeOnDevice).toHaveBeenCalledOnce();
    expect(fetchApi).not.toHaveBeenCalled();
    expect(intent.source).toBe("model");
    expect(intent.to).toBe(TO);
    expect(intent.amount).toBe("7");
  });

  it("does not call on-device completion when the model is not ready", async () => {
    const completeOnDevice = vi.fn(async () => JSON.stringify({ task: "send", to: TO, amount: "1" }));
    const fetchApi = vi.fn(async () => ({
      task: "send" as const,
      to: TO,
      amount: "4",
      source: "model" as const,
    }));
    const intent = await resolveFormIntent({
      prompt: "mandale 4",
      task: "send",
      deviceReady: false,
      completeOnDevice,
      fetchApi,
    });
    expect(completeOnDevice).not.toHaveBeenCalled();
    expect(fetchApi).toHaveBeenCalledOnce();
    expect(intent.source).toBe("model");
    expect(intent.amount).toBe("4");
  });

  it("falls through to /api/agent if on-device inference throws", async () => {
    const completeOnDevice = vi.fn(async () => {
      throw new Error("empty completion");
    });
    const fetchApi = vi.fn(async () => ({
      task: "send" as const,
      to: TO,
      amount: "2",
      source: "model" as const,
    }));
    const intent = await resolveFormIntent({
      prompt: "mandale 2",
      task: "send",
      deviceReady: true,
      completeOnDevice,
      fetchApi,
    });
    expect(intent.amount).toBe("2");
    expect(fetchApi).toHaveBeenCalledOnce();
  });

  it("falls through to heuristic when api is offline", async () => {
    const intent = await resolveFormIntent({
      prompt: `mandale 10 USDT a ${TO}`,
      task: "send",
      deviceReady: false,
      fetchApi: async () => {
        throw new Error("Failed to fetch");
      },
    });
    expect(intent.source).toBe("heuristic");
    expect(intent.to?.toLowerCase()).toBe(TO.toLowerCase());
    expect(intent.amount).toBe("10");
  });

  it("never treats deviceReady without a completer as a successful model", async () => {
    const fetchApi = vi.fn(async () => null);
    const intent = await resolveFormIntent({
      prompt: `mandale 3 USDT a ${TO}`,
      task: "send",
      deviceReady: true,
      fetchApi,
    });
    expect(intent.source).toBe("heuristic");
  });
});
