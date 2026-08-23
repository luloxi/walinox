"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { heuristicIntent, type AgentIntent, type AgentTask } from "@/lib/agent";
import { speechSupported, startSpeech, type SpeechHandle } from "@/lib/speech";
import { cn } from "@/lib/utils";

function QvacMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[10px] font-bold tracking-wide text-primary",
        className,
      )}
      aria-hidden
    >
      QV
    </span>
  );
}

export function QvacHint({
  task,
  owner,
  placeholder,
  label = "En una frase",
  onFill,
}: {
  task: AgentTask;
  owner?: string;
  placeholder: string;
  label?: string;
  onFill: (intent: AgentIntent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kbPad, setKbPad] = useState(0);
  const speech = useRef<SpeechHandle | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const areaId = useId();
  const canSpeak = speechSupported();

  useEffect(() => {
    return () => speech.current?.stop();
  }, []);

  useEffect(() => {
    if (!open) {
      setKbPad(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    function sync() {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const obscured = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKbPad(obscured > 40 ? obscured : 0);
      window.requestAnimationFrame(() => {
        boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      document.getElementById(areaId)?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, areaId]);

  async function apply(raw?: string) {
    const prompt = (raw ?? text).trim();
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      let intent: AgentIntent | null = null;
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, owner, task }),
          signal: AbortSignal.timeout(5000),
        });
        const data = (await res.json()) as AgentIntent & { error?: string };
        if (res.ok && !data.error) intent = data;
      } catch {
        /* offline / no QVAC */
      }
      if (!intent) intent = heuristicIntent(prompt, task);
      onFill(intent);
      setText("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude leer eso");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMic() {
    if (listening) {
      speech.current?.stop();
      speech.current = null;
      setListening(false);
      return;
    }
    setError(null);
    setListening(true);
    const handle = await startSpeech({
      onInterim(said) {
        setText(said);
      },
      onFinal(said) {
        setText(said);
        speech.current?.stop();
        speech.current = null;
        setListening(false);
        void apply(said);
      },
      onError(message) {
        setError(message);
        setListening(false);
        speech.current = null;
      },
      onEnd() {
        setListening(false);
        speech.current = null;
      },
    });
    if (!handle) {
      setListening(false);
      return;
    }
    speech.current = handle;
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!busy && text.trim()) void apply();
  }

  if (!open) {
    return (
      <button
        type="button"
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.99]"
        onClick={() => setOpen(true)}
      >
        <QvacMark />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div
      ref={boxRef}
      className="space-y-2 rounded-2xl border border-primary/30 bg-card p-3"
      style={kbPad > 0 ? { marginBottom: kbPad } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QvacMark />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <button
          type="button"
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
          onClick={() => {
            speech.current?.stop();
            setListening(false);
            setOpen(false);
          }}
        >
          <X className="size-4" />
        </button>
      </div>
      <Textarea
        id={areaId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          window.requestAnimationFrame(() => {
            boxRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }}
        rows={2}
        placeholder={listening ? "Te escucho…" : placeholder}
        className="text-sm"
        disabled={listening}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          className="h-11 flex-1"
          onClick={() => void apply()}
          disabled={busy || listening || !text.trim()}
        >
          {busy ? "…" : "Listo"}
        </Button>
        {canSpeak ? (
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            className="h-11 gap-1.5 px-3"
            onClick={() => void toggleMic()}
            disabled={busy}
            aria-pressed={listening}
            aria-label={listening ? "Dejar de escuchar" : "Hablar"}
          >
            <Mic className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
