import type { ChatMessage, CompletionFn } from "@/lib/agent";
import {
  applyDeleted,
  applyDownloadStart,
  applyLoadError,
  applyLoaded,
  applyProbe,
  applyProgress,
  initialDeviceQvacState,
  isDeviceQvacReady,
  type DeviceQvacState,
} from "@/lib/qvac-device-state";
import { historyFrom } from "@/lib/qvac-history";
import { detectQvacHost, type QvacHost } from "@/lib/qvac-runtime";

export type DeviceQvacListener = (state: DeviceQvacState) => void;

type WorkerResponse =
  | { type: "probed"; ok: boolean }
  | { type: "progress"; downloaded: number; total: number; percentage: number }
  | { type: "loaded"; modelId: string }
  | { type: "completed"; text: string }
  | { type: "unloaded" }
  | { type: "error"; error: string };

export const DEVICE_QVAC_WANTED_KEY = "walinox.qvac.device";

export type DeviceQvacDeps = {
  detectHost?: () => QvacHost;
  spawnWorker?: () => Worker;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
};

function spawnDefaultWorker(): Worker {
  return new Worker(new URL("./qvac-device.worker.ts", import.meta.url), { type: "module" });
}

export function createDeviceQvac(deps: DeviceQvacDeps = {}) {
  let state = initialDeviceQvacState(deps.detectHost?.() ?? detectQvacHost());
  const listeners = new Set<DeviceQvacListener>();
  let worker: Worker | null = null;
  let rpc = 0;
  const pending = new Map<
    number,
    { resolve: (value: WorkerResponse) => void; reject: (error: Error) => void; type: string }
  >();
  let probePromise: Promise<DeviceQvacState> | null = null;
  let downloadPromise: Promise<DeviceQvacState> | null = null;

  function emit(next: DeviceQvacState) {
    state = next;
    for (const listener of listeners) listener(state);
  }

  function storage() {
    return deps.storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
  }

  function readWanted(): boolean {
    try {
      return storage()?.getItem(DEVICE_QVAC_WANTED_KEY) === "1";
    } catch {
      return false;
    }
  }

  function writeWanted(on: boolean) {
    try {
      const store = storage();
      if (!store) return;
      if (on) store.setItem(DEVICE_QVAC_WANTED_KEY, "1");
      else store.removeItem(DEVICE_QVAC_WANTED_KEY);
    } catch {
      /* ignore quota / private mode */
    }
  }

  function onWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const msg = event.data;
    if (msg.type === "progress") {
      emit(applyProgress(state, msg));
      return;
    }
    for (const [id, waiter] of pending) {
      if (
        (waiter.type === "probe" && msg.type === "probed") ||
        (waiter.type === "load" && (msg.type === "loaded" || msg.type === "error")) ||
        (waiter.type === "complete" && (msg.type === "completed" || msg.type === "error")) ||
        (waiter.type === "unload" && (msg.type === "unloaded" || msg.type === "error")) ||
        (waiter.type === "probe" && msg.type === "error")
      ) {
        pending.delete(id);
        if (msg.type === "error") waiter.reject(new Error(msg.error));
        else waiter.resolve(msg);
        return;
      }
    }
  }

  function ensureWorker(): Worker {
    if (worker) return worker;
    const spawn = deps.spawnWorker ?? spawnDefaultWorker;
    worker = spawn();
    worker.addEventListener("message", onWorkerMessage as EventListener);
    worker.addEventListener("error", (event) => {
      const err = event instanceof ErrorEvent ? event.message : "QVAC worker failed";
      for (const [id, waiter] of pending) {
        pending.delete(id);
        waiter.reject(new Error(err || "Cannot find module @qvac/sdk"));
      }
    });
    return worker;
  }

  function call(type: "probe" | "load" | "complete" | "unload", extra?: object): Promise<WorkerResponse> {
    const id = ++rpc;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, type });
      try {
        ensureWorker().postMessage({ type, ...extra });
      } catch (error) {
        pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async function probe(): Promise<DeviceQvacState> {
    if (probePromise) return probePromise;
    probePromise = (async () => {
      const host = deps.detectHost?.() ?? detectQvacHost();
      if (typeof Worker === "undefined" && !deps.spawnWorker) {
        emit(
          applyProbe(state, {
            host,
            canImport: false,
            error: "Cannot find module @qvac/sdk",
          }),
        );
        return state;
      }
      try {
        const msg = await call("probe");
        const ok = msg.type === "probed" && msg.ok;
        emit(applyProbe(state, { host, canImport: ok }));
      } catch (error) {
        emit(
          applyProbe(state, {
            host,
            canImport: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
      return state;
    })();
    const probed = await probePromise;
    if (probed.status === "not_installed" && readWanted()) {
      void download();
    }
    return probed;
  }

  async function download(): Promise<DeviceQvacState> {
    if (downloadPromise) return downloadPromise;
    downloadPromise = (async () => {
      await probe();
      if (state.status === "unsupported" || state.status === "ready") return state;
      emit(applyDownloadStart(state));
      try {
        const msg = await call("load");
        if (msg.type !== "loaded") throw new Error("loadModel did not return a model id");
        emit(applyLoaded(state, msg.modelId));
        writeWanted(true);
      } catch (error) {
        emit(applyLoadError(state, error instanceof Error ? error.message : String(error)));
      }
      return state;
    })();
    try {
      return await downloadPromise;
    } finally {
      downloadPromise = null;
    }
  }

  async function remove(): Promise<DeviceQvacState> {
    try {
      await call("unload");
    } catch {
      /* still drop local ready state */
    }
    writeWanted(false);
    emit(applyDeleted(state));
    return state;
  }

  const completeOnDevice: CompletionFn = async (messages: ChatMessage[]) => {
    if (!isDeviceQvacReady(state)) throw new Error("on-device QVAC is not ready");
    const msg = await call("complete", { history: historyFrom(messages) });
    if (msg.type !== "completed") throw new Error("QVAC SDK returned an empty completion");
    return msg.text;
  };

  return {
    getState: () => state,
    subscribe(listener: DeviceQvacListener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    probe,
    download,
    remove,
    completeOnDevice,
    isReady: () => isDeviceQvacReady(state),
  };
}

export type DeviceQvacController = ReturnType<typeof createDeviceQvac>;

let singleton: DeviceQvacController | null = null;

export function getDeviceQvac(): DeviceQvacController {
  if (!singleton) singleton = createDeviceQvac();
  return singleton;
}
