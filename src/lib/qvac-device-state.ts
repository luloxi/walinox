import {
  BROWSER_UNSUPPORTED_ES,
  classifyQvacFailure,
  detectQvacHost,
  type QvacHost,
} from "@/lib/qvac-runtime";

export type DeviceQvacStatus = "not_installed" | "downloading" | "ready" | "unsupported";

export type DeviceQvacProgress = {
  downloaded: number;
  total: number;
  percentage: number;
};

export type DeviceQvacState = {
  status: DeviceQvacStatus;
  probing: boolean;
  progress: DeviceQvacProgress | null;
  modelId: string | null;
  error: string | null;
  host: QvacHost;
};

/** Qwen3-0.6B-Q4_0.gguf expectedSize from @qvac/sdk QWEN3_600M_INST_Q4. */
export const QWEN3_0_6B_Q4_BYTES = 382_156_480;
export const QWEN3_0_6B_Q4_LABEL = "Qwen3 0.6B Instruct Q4";

export function formatQvacMb(bytes: number): string {
  return (bytes / 1e6).toFixed(1);
}

export function formatQvacProgress(progress: DeviceQvacProgress): string {
  const total = progress.total > 0 ? progress.total : QWEN3_0_6B_Q4_BYTES;
  const pct = Number.isFinite(progress.percentage) ? Math.max(0, Math.min(100, progress.percentage)) : 0;
  return `${formatQvacMb(progress.downloaded)} / ${formatQvacMb(total)} MB (${pct.toFixed(0)}%)`;
}

export function initialDeviceQvacState(host: QvacHost = detectQvacHost()): DeviceQvacState {
  return {
    status: "not_installed",
    probing: true,
    progress: null,
    modelId: null,
    error: null,
    host,
  };
}

export function applyProbe(
  state: DeviceQvacState,
  result: { host: QvacHost; canImport: boolean; error?: string },
): DeviceQvacState {
  if (!result.canImport) {
    return {
      status: "unsupported",
      probing: false,
      progress: null,
      modelId: null,
      error: result.host === "browser" ? BROWSER_UNSUPPORTED_ES : (result.error?.trim() || BROWSER_UNSUPPORTED_ES),
      host: result.host,
    };
  }
  return {
    ...state,
    status: state.status === "ready" && state.modelId ? "ready" : "not_installed",
    probing: false,
    error: null,
    host: result.host,
  };
}

export function applyDownloadStart(state: DeviceQvacState): DeviceQvacState {
  if (state.status === "unsupported") return state;
  return {
    ...state,
    status: "downloading",
    probing: false,
    progress: state.progress ?? { downloaded: 0, total: QWEN3_0_6B_Q4_BYTES, percentage: 0 },
    error: null,
  };
}

export function applyProgress(state: DeviceQvacState, progress: DeviceQvacProgress): DeviceQvacState {
  if (state.status === "unsupported") return state;
  const total = progress.total > 0 ? progress.total : QWEN3_0_6B_Q4_BYTES;
  return {
    ...state,
    status: "downloading",
    probing: false,
    progress: {
      downloaded: Math.max(0, progress.downloaded),
      total,
      percentage: Number.isFinite(progress.percentage) ? progress.percentage : (progress.downloaded / total) * 100,
    },
    error: null,
  };
}

export function applyLoaded(state: DeviceQvacState, modelId: string): DeviceQvacState {
  const id = modelId.trim();
  if (!id) {
    return applyLoadError(state, "loadModel returned an empty model id");
  }
  return {
    ...state,
    status: "ready",
    probing: false,
    progress: null,
    modelId: id,
    error: null,
  };
}

export function applyLoadError(state: DeviceQvacState, error: string): DeviceQvacState {
  if (classifyQvacFailure(error) === "unsupported") {
    return {
      status: "unsupported",
      probing: false,
      progress: null,
      modelId: null,
      error: state.host === "browser" ? BROWSER_UNSUPPORTED_ES : error,
      host: state.host,
    };
  }
  return {
    ...state,
    status: "not_installed",
    probing: false,
    progress: null,
    modelId: null,
    error,
  };
}

export function applyDeleted(state: DeviceQvacState): DeviceQvacState {
  if (state.status === "unsupported") return { ...state, modelId: null, progress: null };
  return {
    ...state,
    status: "not_installed",
    probing: false,
    progress: null,
    modelId: null,
    error: null,
  };
}

export function isDeviceQvacReady(state: DeviceQvacState): boolean {
  return state.status === "ready" && Boolean(state.modelId);
}
