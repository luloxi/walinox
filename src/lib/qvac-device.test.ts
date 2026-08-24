import { describe, expect, it } from "vitest";
import { createDeviceQvac, DEVICE_QVAC_WANTED_KEY } from "@/lib/qvac-device";
import { BROWSER_UNSUPPORTED_ES } from "@/lib/qvac-runtime";

type Inbound = { type: string; history?: unknown };

function fakeWorker(handler: (msg: Inbound, post: (data: object) => void) => void) {
  return () => {
    const message: Array<(event: { data: object }) => void> = [];
    return {
      addEventListener(type: string, fn: EventListener) {
        if (type === "message") message.push(fn as unknown as (event: { data: object }) => void);
      },
      postMessage(msg: Inbound) {
        queueMicrotask(() => handler(msg, (data) => message.forEach((fn) => fn({ data }))));
      },
    } as unknown as Worker;
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("on-device QVAC controller", () => {
  it("stays unsupported when the worker cannot import the SDK", async () => {
    const device = createDeviceQvac({
      detectHost: () => "browser",
      spawnWorker: fakeWorker((_msg, post) => {
        post({ type: "error", error: "Failed to resolve module specifier @qvac/sdk" });
      }),
    });
    const state = await device.probe();
    expect(state.status).toBe("unsupported");
    expect(state.error).toBe(BROWSER_UNSUPPORTED_ES);
    expect(device.isReady()).toBe(false);
    const after = await device.download();
    expect(after.status).toBe("unsupported");
    expect(device.isReady()).toBe(false);
  });

  it("only becomes ready after loadModel returns an id, with real progress", async () => {
    let loaded = false;
    const device = createDeviceQvac({
      detectHost: () => "node",
      spawnWorker: fakeWorker((msg, post) => {
        if (msg.type === "probe") {
          post({ type: "probed", ok: true });
          return;
        }
        if (msg.type === "load") {
          post({ type: "progress", downloaded: 100_000_000, total: 382_156_480, percentage: 26 });
          post({ type: "loaded", modelId: "qwen-real" });
          loaded = true;
          return;
        }
        if (msg.type === "complete") {
          post({
            type: "completed",
            text: JSON.stringify({ task: "send", to: "0x3333333333333333333333333333333333333333", amount: "1" }),
          });
          return;
        }
        if (msg.type === "unload") post({ type: "unloaded" });
      }),
      storage: memoryStorage(),
    });
    await device.probe();
    expect(device.isReady()).toBe(false);
    const seen: string[] = [];
    device.subscribe((s) => seen.push(s.status));
    const state = await device.download();
    expect(loaded).toBe(true);
    expect(state.status).toBe("ready");
    expect(state.modelId).toBe("qwen-real");
    expect(device.isReady()).toBe(true);
    expect(seen).toContain("downloading");
    const text = await device.completeOnDevice([{ role: "user", content: "hola" }]);
    expect(text).toContain('"task":"send"');
    await device.remove();
    expect(device.isReady()).toBe(false);
    expect(device.getState().status).toBe("not_installed");
  });

  it("does not restore a wanted model when the runtime cannot import", async () => {
    const device = createDeviceQvac({
      detectHost: () => "browser",
      storage: memoryStorage({ [DEVICE_QVAC_WANTED_KEY]: "1" }),
      spawnWorker: fakeWorker((_msg, post) => {
        post({ type: "error", error: "Cannot find module '@qvac/sdk'" });
      }),
    });
    await device.probe();
    await new Promise((r) => setTimeout(r, 10));
    expect(device.isReady()).toBe(false);
    expect(device.getState().status).toBe("unsupported");
  });
});
