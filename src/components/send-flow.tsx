"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { isAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { ChannelPanel } from "@/components/channel-panel";
import { AgentHelp } from "@/components/agent-help";
import { useWallet } from "@/components/wallet-provider";
import { toBaseUnits } from "@/lib/agent";
import { encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { payloadToDataUrl } from "@/lib/qr";
import { receiptFromPermit } from "@/lib/receipts";
import { PERMIT2_ADDRESS } from "@/lib/permit2";
import { USDC, USDT, type TokenInfo } from "@/lib/tokens";
import { buildPermit } from "@/lib/permit";
import { buildPermit2 } from "@/lib/permit2";
import type { AgentPermit } from "@/lib/agent";
import type { Channel } from "@/lib/channels";

function draftFromForm(
  owner: string,
  to: string,
  amount: string,
  token: TokenInfo,
): AgentPermit {
  const value = toBaseUnits(amount, token.decimals);
  if (token.permit === "permit2") {
    const typed = buildPermit2({
      token: token.address,
      spender: to,
      amount: value,
    });
    return {
      kind: "permit2",
      token,
      owner,
      spender: typed.message.spender,
      value: typed.message.permitted.amount,
      typed,
      explanation: `Permit2: ${to} puede tomar ${amount} ${token.symbol}.`,
      complianceNote: "USDT no tiene permit(). Se usa Permit2.",
      source: "heuristic",
    };
  }
  const typed = buildPermit({
    domain: {
      name: token.name,
      version: token.version,
      chainId: token.chainId,
      verifyingContract: token.address,
    },
    owner,
    spender: to,
    value,
  });
  return {
    kind: "erc2612",
    token,
    owner: typed.message.owner,
    spender: typed.message.spender,
    value: typed.message.value,
    typed,
    explanation: `Permit ERC-2612 de ${amount} ${token.symbol}.`,
    complianceNote: "permit() deja el allowance. transferFrom mueve la plata.",
    source: "heuristic",
  };
}

export function SendFlow() {
  const { wallet, error: walletError } = useWallet();
  const [tab, setTab] = useState("online");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<TokenInfo>(USDT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentPermit | null>(null);
  const [envelope, setEnvelope] = useState<SignedEnvelope | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sent, setSent] = useState<Channel | null>(null);

  function fillForm(next: { to: string; amount: string; token: TokenInfo }) {
    setTo(next.to);
    setAmount(next.amount);
    setToken(next.token);
  }

  async function sendOnline() {
    if (!wallet) return;
    if (!isAddress(to)) {
      setError("Address de destino inválida");
      return;
    }
    setBusy(true);
    setError(null);
    setHash(null);
    try {
      const value = toBaseUnits(amount, token.decimals);
      const tx = await wallet.transfer(token.address, to, value);
      setHash(tx);
      receiptFromPermit(
        { owner: wallet.address, spender: to, value, token: token.symbol },
        { action: "sent", channel: "online", signature: tx, valid: true },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar. Hace falta USDT para el gas (paymaster) y saldo del token.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function prepareOffline() {
    if (!wallet) return;
    if (!isAddress(to)) {
      setError("Address de destino inválida");
      return;
    }
    setError(null);
    setEnvelope(null);
    setDraft(draftFromForm(wallet.address, to, amount, token));
  }

  async function signOffline() {
    if (!wallet || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const signature = await wallet.signTypedData({
        domain: draft.typed.domain,
        types: draft.typed.types,
        message: draft.typed.message as unknown as Record<string, unknown>,
      });
      const next: SignedEnvelope = {
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
      setEnvelope(next);
      setQrUrl(await payloadToDataUrl(encodeEnvelope(next)));
      receiptFromPermit(
        { owner: draft.owner, spender: draft.spender, value: draft.value, token: draft.token.symbol },
        { action: "signed", channel: "qr", signature, valid: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo firmar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="text-lg font-semibold">Enviar</h2>
        <p className="text-xs text-muted-foreground">
          Online paga el gas en USDT (WDK gasless). Sin internet: firmás y mostrás un QR.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="online" className="flex-1 cursor-pointer">
            Online
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex-1 cursor-pointer">
            Sin internet
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Para</span>
            <Input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="0x…"
              className="font-mono"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Monto</span>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>
          <div className="flex gap-2">
            {[USDT, USDC].map((item) => (
              <Button
                key={item.symbol}
                type="button"
                size="sm"
                variant={token.symbol === item.symbol ? "default" : "outline"}
                className="h-8"
                onClick={() => setToken(item)}
              >
                {item.symbol}
              </Button>
            ))}
          </div>
          {wallet ? <AgentHelp owner={wallet.address} onFill={fillForm} /> : null}
        </div>

        <TabsContent value="online" className="mt-4 space-y-3">
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!wallet || busy || !to || !amount}
            onClick={() => void sendOnline()}
          >
            {busy ? "Enviando…" : `Enviar ${token.symbol}`}
          </Button>
          {hash ? (
            <p className="break-all font-mono text-[11px] text-teal-300">Tx {hash}</p>
          ) : null}
        </TabsContent>

        <TabsContent value="offline" className="mt-4 space-y-3">
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!wallet || !to || !amount}
            onClick={() => prepareOffline()}
          >
            Armar permiso offline
          </Button>
          {draft ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <PermitCard
                kind={draft.kind}
                owner={draft.owner}
                spender={draft.spender}
                value={draft.value}
                tokenLabel={draft.token.symbol}
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
                  disabled={!wallet || busy}
                  onClick={() => {
                    if (!wallet) return;
                    setBusy(true);
                    void wallet
                      .approve(draft.token.address, PERMIT2_ADDRESS)
                      .then((tx) => {
                        setHash(tx);
                        setError(null);
                      })
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : "Approve falló"),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Primera vez USDT: aprobar Permit2
                </Button>
              ) : null}
              {!envelope ? (
                <Button type="button" className="h-11 w-full" disabled={busy} onClick={() => void signOffline()}>
                  {busy ? "Firmando…" : "Firmar y generar QR"}
                </Button>
              ) : null}
            </motion.div>
          ) : null}
          {envelope ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Mostrale este QR al otro</p>
              <ChannelPanel envelope={envelope} qrUrl={qrUrl} onSent={setSent} />
              {sent ? <p className="text-xs text-teal-300">Guardado en actividad.</p> : null}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

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
    </div>
    </div>
  );
}
