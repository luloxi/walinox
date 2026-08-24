/// <reference lib="webworker" />

type Progress = { downloaded: number; total: number; percentage: number };

type Sdk = {
  loadModel: (opts: {
    modelSrc: unknown;
    modelType?: string;
    modelConfig?: { ctx_size?: number };
    onProgress?: (p: Progress) => void;
  }) => Promise<string>;
  completion: (opts: {
    modelId: string;
    history: { role: "user" | "assistant"; content: string }[];
    stream: false;
  }) => { final: Promise<{ contentText?: string; raw?: { fullText?: string } }> };
  unloadModel: (opts: { modelId: string; clearStorage?: boolean }) => Promise<void>;
  QWEN3_600M_INST_Q4: unknown;
};

let sdk: Sdk | null = null;
let modelId: string | null = null;

async function importSdk(): Promise<Sdk> {
  try {
    return (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "@qvac/sdk")) as Sdk;
  } catch {
    const importer = new Function("s", "return import(s)") as (s: string) => Promise<Sdk>;
    return importer("@qvac/sdk");
  }
}

async function ensureSdk(): Promise<Sdk> {
  if (!sdk) sdk = await importSdk();
  if (typeof sdk.loadModel !== "function" || typeof sdk.completion !== "function") {
    throw new Error("Cannot find module @qvac/sdk loadModel");
  }
  return sdk;
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data as
    | { type: "probe" }
    | { type: "load" }
    | { type: "complete"; history: { role: "user" | "assistant"; content: string }[] }
    | { type: "unload" };
  try {
    if (msg.type === "probe") {
      await ensureSdk();
      self.postMessage({ type: "probed", ok: true });
      return;
    }
    if (msg.type === "load") {
      const loaded = await ensureSdk();
      const id = await loaded.loadModel({
        modelSrc: loaded.QWEN3_600M_INST_Q4,
        modelType: "llm",
        modelConfig: { ctx_size: 2048 },
        onProgress: (p) => {
          self.postMessage({
            type: "progress",
            downloaded: p.downloaded,
            total: p.total,
            percentage: p.percentage,
          });
        },
      });
      if (!id?.trim()) throw new Error("loadModel returned an empty model id");
      modelId = id;
      self.postMessage({ type: "loaded", modelId: id });
      return;
    }
    if (msg.type === "complete") {
      const loaded = await ensureSdk();
      if (!modelId) throw new Error("on-device QVAC is not ready");
      const final = await loaded.completion({ modelId, history: msg.history, stream: false }).final;
      const text = (final.contentText || final.raw?.fullText || "").trim();
      if (!text) throw new Error("QVAC SDK returned an empty completion");
      self.postMessage({ type: "completed", text });
      return;
    }
    if (msg.type === "unload") {
      const loaded = await ensureSdk();
      if (modelId) {
        await loaded.unloadModel({ modelId, clearStorage: true });
      }
      modelId = null;
      self.postMessage({ type: "unloaded" });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
