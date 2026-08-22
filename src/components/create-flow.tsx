"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { ChannelPanel } from "@/components/channel-panel";
import { useWallet } from "@/components/wallet-provider";
import {
  heuristicComplete,
  naturalLanguageToPermit,
  type AgentPermit,
} from "@/lib/agent";
import { encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { payloadToDataUrl } from "@/lib/qr";
import { receiptFromPermit } from "@/lib/receipts";
import { encodeApprove, sendCall } from "@/lib/chain";
import { PERMIT2_ADDRESS } from "@/lib/permit2";
import type { Channel } from "@/lib/channels";

const SAMPLE = "allow 0x1111111111111111111111111111111111111111 to spend 100 USDT";

function toEnvelope(draft: AgentPermit, signature: string): SignedEnvelope {
  return {
    v: 1,
    kind: draft.kind,
    owner: draft.owner,
    spender: draft.spender,
    token: draft.token.address,
    value: draft.value,
    typedData: {
      domain: draft.typed.domain,
      types: draft.typed.types,
      primaryType: draft.typed.primaryType,
      message: draft.typed.message as unknown as Record<string, unknown>,
    },
    signature,
    explanation: draft.explanation,
    complianceNote: draft.complianceNote,
  };
}

export function CreateFlow() {
  const { wallet, error: walletError } = useWallet();
  const [prompt, setPrompt] = useState(SAMPLE);
  const [busy, setBusy] = useState<"compose" | "sign" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentPermit | null>(null);
  const [envelope, setEnvelope] = useState<SignedEnvelope | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sent, setSent] = useState<Channel | null>(null);

  async function compose() {
    if (!wallet) return;
    setBusy("compose");
    setError(null);
    setEnvelope(null);
    setSent(null);
    try {
      let next: AgentPermit;
      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, owner: wallet.address }),
        });
        if (!response.ok) throw new Error("agent route failed");
        const body = (await response.json()) as AgentPermit;
        if (!body.kind || !body.typed || !body.spender) throw new Error("incomplete agent payload");
        next = body;
      } catch {
        next = await naturalLanguageToPermit(prompt, {
          owner: wallet.address,
          complete: async () => heuristicComplete(prompt, wallet.address),
        });
      }
      setDraft(next);
      receiptFromPermit(
        { owner: next.owner, spender: next.spender, value: next.value, token: next.token.symbol },
        { action: "created", channel: "copy", signature: "0x" },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compose failed");
    } finally {
      setBusy(null);
    }
  }

  async function sign() {
    if (!wallet || !draft) return;
    setBusy("sign");
    setError(null);
    try {
      const signature = await wallet.signTypedData({
        domain: draft.typed.domain,
        types: draft.typed.types,
        message: draft.typed.message as unknown as Record<string, unknown>,
      });
      const next = toEnvelope(draft, signature);
      setEnvelope(next);
      setQrUrl(await payloadToDataUrl(encodeEnvelope(next)));
      receiptFromPermit(
        { owner: draft.owner, spender: draft.spender, value: draft.value, token: draft.token.symbol },
        { action: "signed", channel: "qr", signature, valid: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <label htmlFor="permit-prompt" className="text-sm font-medium">
          What should this permit allow?
        </label>
        <Textarea
          id="permit-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          className="min-h-24 text-base"
        />
        <Button
          type="button"
          className="h-11 w-full"
          onClick={() => void compose()}
          disabled={!wallet || busy !== null}
        >
          {busy === "compose" ? "Composing…" : "Compose permit"}
        </Button>
      </section>

      {walletError ? (
        <Alert>
          <AlertDescription>{walletError}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {draft ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <PermitCard
            kind={draft.kind}
            owner={draft.owner}
            spender={draft.spender}
            value={draft.value}
            tokenLabel={`${draft.token.symbol} · ${draft.kind}`}
            nonce={draft.typed.message.nonce}
            deadline={draft.typed.message.deadline}
            chainId={draft.typed.domain.chainId}
            explanation={draft.explanation}
            complianceNote={draft.complianceNote}
          />
          {draft.kind === "permit2" ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                const { to, data } = encodeApprove(draft.token.address, PERMIT2_ADDRESS);
                void sendCall(to, data).catch((err: unknown) =>
                  setError(err instanceof Error ? err.message : "Approve failed"),
                );
              }}
            >
              Approve Permit2 once
            </Button>
          ) : null}
          {!envelope ? (
            <Button
              type="button"
              className="h-11 w-full"
              onClick={() => void sign()}
              disabled={busy !== null}
            >
              {busy === "sign" ? "Signing with WDK…" : "Sign with WDK"}
            </Button>
          ) : null}
        </motion.div>
      ) : null}

      {envelope ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h2 className="text-sm font-medium">Transmit offline</h2>
          <ChannelPanel envelope={envelope} qrUrl={qrUrl} onSent={setSent} />
          {sent ? (
            <p className="text-xs text-teal-300">Receipt stored for {sent}.</p>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}
