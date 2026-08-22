"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { heuristicIntent, type AgentIntent, type AgentTask } from "@/lib/agent";

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
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const prompt = text.trim();
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
        });
        const data = (await res.json()) as AgentIntent & { error?: string };
        if (res.ok && !data.error) intent = data;
        else if (!res.ok) throw new Error(data.error ?? "No pude leer eso");
      } catch (err) {
        if (err instanceof TypeError) {
          intent = heuristicIntent(prompt, task, owner);
        } else {
          throw err;
        }
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
        rows={2}
        placeholder={placeholder}
        className="text-sm"
        autoFocus
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-8" onClick={() => void apply()} disabled={busy || !text.trim()}>
          {busy ? "…" : "Completar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
