export type QvacHost = "node" | "bare" | "expo" | "browser";

export const OFFICIAL_QVAC_HOSTS: readonly QvacHost[] = ["node", "bare", "expo"];

type ProbeEnv = {
  Bare?: unknown;
  process?: { versions?: { node?: string } };
  navigator?: { product?: string };
};

/** Official @qvac/sdk hosts: Node, Bare, Expo. A plain Chrome/Safari PWA is "browser". */
export function detectQvacHost(env: ProbeEnv = globalThis as ProbeEnv): QvacHost {
  if (env.Bare) return "bare";
  if (env.navigator?.product === "ReactNative") return "expo";
  if (env.process?.versions?.node) return "node";
  return "browser";
}

export function officialQvacHost(host: QvacHost): boolean {
  return host !== "browser";
}

export function classifyQvacFailure(error: string): "unsupported" | "failed" {
  const t = error.toLowerCase();
  if (
    /cannot find module|module not found|failed to resolve|bare runtime|native addon|\.node\b|fs is not defined|process is not defined|window is not defined|not supported in (the )?browser|no such file|dynamic import|importing a module script failed|error loading dynamically imported module|bare-rpc|worker_threads|child_process|dlopen|llamacpp addon/.test(
      t,
    )
  ) {
    return "unsupported";
  }
  return "failed";
}

export const BROWSER_UNSUPPORTED_ES =
  "Este navegador no puede correr QVAC en el dispositivo. El SDK oficial usa llama.cpp nativo en Node, Bare o Expo; Chrome, Safari y la PWA de Android no tienen ese runtime. Si más adelante hay un camino web (wasm/GPU) en el SDK, este mismo botón lo usa.";
