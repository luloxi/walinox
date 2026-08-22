"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { ChannelPanel } from "@/components/channel-panel";
import { WalletCard } from "@/components/wallet-card";
import { Guide } from "@/components/guide";
import { ActivityList } from "@/components/activity-list";
import { useWallet } from "@/components/wallet-provider";
import {
  heuristicComplete,
  naturalLanguageToPermit,
  type AgentPermit,
} from "@/lib/agent";
import { encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { payloadToDataUrl } from "@/lib/qr";
import { listReceipts, receiptFromPermit } from "@/lib/receipts";
import { encodeApprove, sendCall } from "@/lib/chain";
import { PERMIT2_ADDRESS } from "@/lib/permit2";
import type { Channel } from "@/lib/channels";
import type { Receipt } from "@/lib/receipts";

const SAMPLE = "allow 0x1111111111111111111111111111111111111111 to spend 10 USDT";

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

const STEPS = ["Write", "Sign", "Show QR"] as const;

export function CreateFlow() {
  const { wallet, error: walletError } = useWallet();
  const [prompt, setPrompt] = useState(SAMPLE);
  const [busy, setBusy] = useState<"compose" | "sign" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentPermit | null>(null);
  const [envelope, setEnvelope] = useState<SignedEnvelope | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sent, setSent] = useState<Channel | null>(null);
  const [recent, setRecent] = useState<Receipt[]>([]);

  useEffect(() => {
    setRecent(listReceipts().slice(0, 3));
  }, [sent, envelope]);

  const step = envelope ? 2 : draft ? 1 : 0;

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
      setError(err instanceof Error ? err.message : "Couldn’t understand that. Include an 0x address and an amount.");
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
      <WalletCard />
      <Guide />

      <ol className="grid grid-cols-3 gap-2 text-center text-[11px]">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-2 py-1.5 ${
              index === step
                ? "bg-teal-400 text-zinc-950 font-medium"
                : index < step
                  ? "bg-teal-400/20 text-teal-200"
                  : "bg-white/5 text-muted-foreground"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <section className="space-y-2">
        <label htmlFor="permit-prompt" className="text-sm font-medium">
          Who can spend, and how much?
        </label>
        <p className="text-xs text-muted-foreground">
          Example: allow 0xTheirAddress to spend 10 USDT
        </p>
        <Textarea
          id="permit-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          className="min-h-20 text-base"
        />
        <Button
          type="button"
          className="h-11 w-full"
          onClick={() => void compose()}
          disabled={!wallet || busy !== null}
        >
          {busy === "compose" ? "Reading that…" : "1 · Next — review permission"}
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
          <p className="text-sm font-medium">Check this before you sign</p>
          <PermitCard
            kind={draft.kind}
            owner={draft.owner}
            spender={draft.spender}
            value={draft.value}
            tokenLabel={`${draft.token.symbol} · ${draft.kind === "permit2" ? "USDT via Permit2" : "ERC-2612"}`}
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
              First time with USDT? Approve Permit2 (needs gas)
            </Button>
          ) : null}
          {!envelope ? (
            <Button
              type="button"
              className="h-11 w-full"
              onClick={() => void sign()}
              disabled={busy !== null}
            >
              {busy === "sign" ? "Signing…" : "2 · Sign on this phone"}
            </Button>
          ) : null}
        </motion.div>
      ) : null}

      {envelope ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <p className="text-sm font-medium">3 · Show this QR to the other phone</p>
          <ChannelPanel envelope={envelope} qrUrl={qrUrl} onSent={setSent} />
          {sent ? (
            <p className="text-xs text-teal-300">Saved to History ({sent}).</p>
          ) : null}
        </motion.div>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent activity</h2>
          <Link href="/summary" className="cursor-pointer text-xs text-teal-300">
            See all
          </Link>
        </div>
        <ActivityList receipts={recent} empty="Nothing yet. Sign a permission and it shows up here." />
      </section>
    </div>
  );
}
