"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { heuristicComplete, naturalLanguageToPermit } from "@/lib/agent";
import { fromBaseUnits } from "@/lib/format";
import type { TokenInfo } from "@/lib/tokens";

export function AgentHelp({
  owner,
  onFill,
}: {
  owner: string;
  onFill: (next: { to: string; amount: string; token: TokenInfo }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      const result = await naturalLanguageToPermit(text, {
        owner,
        complete: async () => heuristicComplete(text, owner),
      });
      onFill({
        to: result.spender,
        amount: fromBaseUnits(result.value, result.token.decimals),
        token: result.token,
      });
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
        className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="size-3.5 text-teal-300" />
        ¿Necesitás ayuda para completar?
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 p-3">
      <p className="text-xs text-muted-foreground">
        Escribí como le hablarías a un amigo. Completamos el formulario.
      </p>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        placeholder="mandale 10 USDT a 0x…"
        className="text-sm"
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-8" onClick={() => void apply()} disabled={busy}>
          {busy ? "…" : "Completar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
