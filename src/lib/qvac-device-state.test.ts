import { describe, expect, it } from "vitest";
import {
  applyDeleted,
  applyDownloadStart,
  applyLoadError,
  applyLoaded,
  applyProbe,
  applyProgress,
  formatQvacProgress,
  initialDeviceQvacState,
  isDeviceQvacReady,
  QWEN3_0_6B_Q4_BYTES,
} from "@/lib/qvac-device-state";
import { BROWSER_UNSUPPORTED_ES } from "@/lib/qvac-runtime";

describe("on-device QVAC settings state machine", () => {
  it("starts not installed and probing", () => {
    const state = initialDeviceQvacState("browser");
    expect(state.status).toBe("not_installed");
    expect(state.probing).toBe(true);
    expect(isDeviceQvacReady(state)).toBe(false);
  });

  it("marks Chrome PWA unsupported when the SDK import fails", () => {
    const state = applyProbe(initialDeviceQvacState("browser"), {
      host: "browser",
      canImport: false,
      error: "Cannot find module '@qvac/sdk'",
    });
    expect(state.status).toBe("unsupported");
    expect(state.error).toBe(BROWSER_UNSUPPORTED_ES);
    expect(isDeviceQvacReady(state)).toBe(false);
    expect(applyDownloadStart(state).status).toBe("unsupported");
  });

  it("stays not installed until loadModel returns a model id", () => {
    let state = applyProbe(initialDeviceQvacState("node"), { host: "node", canImport: true });
    expect(state.status).toBe("not_installed");
    expect(isDeviceQvacReady(state)).toBe(false);

    state = applyDownloadStart(state);
    expect(state.status).toBe("downloading");
    state = applyProgress(state, { downloaded: 50_000_000, total: QWEN3_0_6B_Q4_BYTES, percentage: 13.1 });
    expect(formatQvacProgress(state.progress!)).toContain("50.0 / 382.2 MB (13%)");
    expect(isDeviceQvacReady(state)).toBe(false);

    state = applyLoaded(state, "   ");
    expect(state.status).toBe("not_installed");
    expect(isDeviceQvacReady(state)).toBe(false);

    state = applyLoaded(applyDownloadStart(state), "qwen3-0.6b");
    expect(state.status).toBe("ready");
    expect(state.modelId).toBe("qwen3-0.6b");
    expect(isDeviceQvacReady(state)).toBe(true);
  });

  it("does not call a failed native load 'ready'", () => {
    const downloading = applyDownloadStart(
      applyProbe(initialDeviceQvacState("browser"), { host: "browser", canImport: true }),
    );
    const failed = applyLoadError(downloading, "Cannot find module llama.cpp addon");
    expect(failed.status).toBe("unsupported");
    expect(failed.modelId).toBeNull();
    expect(isDeviceQvacReady(failed)).toBe(false);
  });

  it("keeps a network failure as not installed so the user can retry", () => {
    const downloading = applyDownloadStart(
      applyProbe(initialDeviceQvacState("node"), { host: "node", canImport: true }),
    );
    const failed = applyLoadError(downloading, "fetch failed");
    expect(failed.status).toBe("not_installed");
    expect(failed.error).toBe("fetch failed");
  });

  it("delete returns to not installed", () => {
    const ready = applyLoaded(
      applyProbe(initialDeviceQvacState("node"), { host: "node", canImport: true }),
      "mid",
    );
    const gone = applyDeleted(ready);
    expect(gone.status).toBe("not_installed");
    expect(gone.modelId).toBeNull();
    expect(isDeviceQvacReady(gone)).toBe(false);
  });
});
