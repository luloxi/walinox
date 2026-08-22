type SpeechCtor = new () => SpeechSession;

type SpeechSession = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechStatic = SpeechCtor & {
  available?: (opts: { langs: string[]; onDevice?: boolean }) => Promise<string>;
  install?: (opts: { langs: string[] }) => Promise<boolean>;
};

const LANGS = ["es-AR", "es-ES", "es"];

function speechCtor(): SpeechStatic | null {
  const w = globalThis as typeof globalThis & {
    SpeechRecognition?: SpeechStatic;
    webkitSpeechRecognition?: SpeechStatic;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return Boolean(speechCtor());
}

export type SpeechHandle = {
  stop: () => void;
};

export async function startSpeech(opts: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): Promise<SpeechHandle | null> {
  const Ctor = speechCtor();
  if (!Ctor) {
    opts.onError("Este navegador no escucha voz.");
    return null;
  }

  let local = false;
  try {
    if (typeof Ctor.available === "function") {
      for (const lang of LANGS) {
        const status = await Ctor.available({ langs: [lang], onDevice: true });
        if (status === "available") {
          local = true;
          break;
        }
        if (status === "downloadable" && typeof Ctor.install === "function") {
          const ok = await Ctor.install({ langs: [lang] });
          if (ok) local = true;
          break;
        }
      }
    }
  } catch {
    local = false;
  }

  const rec = new Ctor();
  rec.lang = "es-AR";
  rec.continuous = false;
  rec.interimResults = true;
  if ("processLocally" in rec) rec.processLocally = local;

  rec.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i];
      const said = piece[0]?.transcript ?? "";
      if (piece.isFinal) finalText += said;
      else interim += said;
    }
    if (interim) opts.onInterim(interim.trim());
    if (finalText.trim()) opts.onFinal(finalText.trim());
  };
  rec.onerror = (event) => {
    if (event.error === "aborted" || event.error === "no-speech") {
      opts.onEnd();
      return;
    }
    if (event.error === "not-allowed") opts.onError("El micrófono está bloqueado.");
    else opts.onError("No pude escucharte.");
    opts.onEnd();
  };
  rec.onend = () => opts.onEnd();

  try {
    rec.start();
  } catch {
    opts.onError("No pude abrir el micrófono.");
    return null;
  }

  return {
    stop() {
      try {
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      }
    },
  };
}
