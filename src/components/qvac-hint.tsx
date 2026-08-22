"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { heuristicIntent, type AgentIntent, type AgentTask } from "@/lib/agent";
import { speechSupported, startSpeech, type SpeechHandle } from "@/lib/speech";

export function QvacHint({
  task,
  owner,
  placeholder,
  onFill,
}: {
  task: AgentTask;
  owner?: string;
  placeholder: string;
  onFill: (intent: AgentIntent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speech = useRef<SpeechHandle | null>(null);
  const canSpeak = speechSupported();

  useEffect(() => {
    return () => speech.current?.stop();
  }, []);

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
        /* QVAC may be down; the heuristic still fills the form. */
      }
      if (!intent) intent = heuristicIntent(prompt, task, owner);
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
        className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="size-3.5 text-primary/80" />
        ¿En una frase?
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder={listening ? "Te escucho…" : placeholder}
        className="text-sm"
        autoFocus
        disabled={listening}
      />
      <p className="text-[11px] text-muted-foreground">Enter envía. Shift+Enter, otra línea.</p>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-8" onClick={() => void apply()} disabled={busy || listening || !text.trim()}>
          {busy ? "…" : "Completar"}
        </Button>
        {canSpeak ? (
          <Button
            type="button"
            size="sm"
            variant={listening ? "default" : "outline"}
            className="h-8"
            onClick={() => void toggleMic()}
            disabled={busy}
            aria-pressed={listening}
            aria-label={listening ? "Dejar de escuchar" : "Hablar"}
          >
            <Mic className="size-3.5" />
            {listening ? "Escuchando…" : "Hablar"}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={() => {
            speech.current?.stop();
            setListening(false);
            setOpen(false);
          }}
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}
