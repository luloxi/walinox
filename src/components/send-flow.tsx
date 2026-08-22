"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { isAddress } from "ethers";
import { ClipboardPaste, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressInput } from "@/components/address-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { ChannelPanel } from "@/components/channel-panel";
import { AgentHelp } from "@/components/agent-help";
import { ContactPicker } from "@/components/contact-picker";
import { SaveContact } from "@/components/save-contact";
import { QrScanner } from "@/components/qr-scanner";
import { UsdtLogo } from "@/components/usdt-logo";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { useUsdtBalance } from "@/components/use-usdt-balance";
import { useWallet } from "@/components/wallet-provider";
import { toBaseUnits } from "@/lib/agent";
import { encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { payloadToDataUrl } from "@/lib/qr";
import { receiptFromPermit } from "@/lib/receipts";
import { PERMIT2_ADDRESS, buildPermit2 } from "@/lib/permit2";
import { USDT } from "@/lib/tokens";
import { parsePaymentAddress } from "@/lib/payment-address";
import { rememberContact } from "@/lib/contacts";
import { isEnsName, resolveEns } from "@/lib/ens";
import type { AgentPermit } from "@/lib/agent";
import type { Channel } from "@/lib/channels";

function draftFromForm(owner: string, to: string, amount: string): AgentPermit {
  const value = toBaseUnits(amount, USDT.decimals);
  const typed = buildPermit2({
    token: USDT.address,
    spender: to,
    amount: value,
  });
  return {
    kind: "permit2",
    token: USDT,
    owner,
    spender: typed.message.spender,
    value: typed.message.permitted.amount,
    typed,
    explanation: `Permit2: ${to} puede tomar ${amount} USDT.`,
    complianceNote: "USDT no tiene permit(). Se usa Permit2.",
    source: "heuristic",
  };
}

function takePercent(balance: string, ratio: number): string {
  const value = Number(balance);
  if (!Number.isFinite(value) || value <= 0) return "";
  return (value * ratio).toFixed(6).replace(/\.?0+$/, "");
}

export function SendFlow() {
  const { wallet, error: walletError } = useWallet();
  const { usdt } = useUsdtBalance(wallet?.address);
  const [tab, setTab] = useState("online");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentPermit | null>(null);
  const [envelope, setEnvelope] = useState<SignedEnvelope | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sent, setSent] = useState<Channel | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get("to");
    if (preset) setTo(preset);
  }, []);

  function applyAddress(raw: string) {
    const text = raw.trim();
    const addr = parsePaymentAddress(text);
    if (addr) {
      setTo(addr);
      setError(null);
      return true;
    }
    if (isEnsName(text)) {
      setTo(text);
      setError(null);
      return true;
    }
    setError("No hay un address, ENS o Basename en eso");
    return false;
  }

  async function destination(): Promise<string | null> {
    if (isAddress(to)) return to;
    if (isEnsName(to)) return resolveEns(to);
    return parsePaymentAddress(to);
  }

  async function pasteAddress() {
    try {
      const text = await navigator.clipboard.readText();
      applyAddress(text);
    } catch {
      setError("No se pudo leer el portapapeles");
    }
  }

  async function sendOnline() {
    if (!wallet) return;
    const dest = await destination();
    if (!dest || !isAddress(dest)) {
      setError("Address, ENS o Basename inválido");
      return;
    }
    setBusy(true);
    setError(null);
    setHash(null);
    try {
      const value = toBaseUnits(amount, USDT.decimals);
      const tx = await wallet.transfer(USDT.address, dest, value);
      setHash(tx);
      receiptFromPermit(
        { owner: wallet.address, spender: dest, value, token: USDT.symbol },
        { action: "sent", channel: "online", signature: tx, valid: true },
      );
      rememberContact(dest);
      setSavedTo(dest);
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
    const dest = await destination();
    if (!dest || !isAddress(dest)) {
      setError("Address, ENS o Basename inválido");
      return;
    }
    setTo(dest);
    setError(null);
    setEnvelope(null);
    setDraft(draftFromForm(wallet.address, dest, amount));
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

  const hasBalance = Boolean(usdt && Number(usdt) > 0);

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
          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">Para</span>
            <ContactPicker selected={to} onPick={(contact) => setTo(contact.address)} />
            <div className="flex gap-2">
              <AddressInput value={to} onChange={setTo} />
              <Button
                type="button"
                variant="secondary"
                className="h-11 shrink-0 gap-1.5 px-3"
                onClick={() => void pasteAddress()}
              >
                <ClipboardPaste className="size-4" />
                Pegar
              </Button>
              <Button
                type="button"
                variant={scanning ? "default" : "secondary"}
                className="h-11 shrink-0 gap-1.5 px-3"
                onClick={() => {
                  setScanning((value) => !value);
                  setError(null);
                }}
              >
                <ScanLine className="size-4" />
                QR
              </Button>
            </div>
            <QrScanner
              active={scanning}
              onResult={(text) => {
                if (applyAddress(text)) setScanning(false);
              }}
              onError={(message) => {
                setError(message);
                setScanning(false);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monto</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                Saldo{" "}
                {usdt == null
                  ? "—"
                  : Number(usdt).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                <UsdtLogo className="size-3.5" />
              </span>
            </div>
            <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-inset focus-within:ring-ring/50 dark:bg-input/30">
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="h-11 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
              />
              <UsdtLogo className="mr-3 size-5 shrink-0" />
              <span className="sr-only">USDT</span>
            </div>
            <div className="flex gap-2">
              {[25, 50, 75].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1"
                  disabled={!hasBalance}
                  onClick={() => setAmount(takePercent(usdt ?? "0", pct / 100))}
                >
                  {pct}%
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 flex-1"
                disabled={!hasBalance}
                onClick={() => setAmount(usdt ?? "")}
              >
                MAX
              </Button>
            </div>
          </div>
          {wallet ? (
            <AgentHelp
              owner={wallet.address}
              onFill={(next) => {
                setTo(next.to);
                setAmount(next.amount);
              }}
            />
          ) : null}
        </div>

        <TabsContent value="online" className="mt-4 space-y-3">
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!wallet || busy || !to || !amount}
            onClick={() => void sendOnline()}
          >
            {busy ? (
              "Enviando…"
            ) : (
              <span className="inline-flex items-center gap-2">
                Enviar
                <UsdtLogo className="size-4" />
              </span>
            )}
          </Button>
          {hash ? (
            <div className="space-y-1">
              <p className="break-all font-mono text-[11px] text-muted-foreground">Tx {hash}</p>
              <EtherscanTxLink hash={hash} className="text-xs" />
            </div>
          ) : null}
          {savedTo ? <SaveContact address={savedTo} /> : null}
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
                Primera vez: aprobar Permit2
              </Button>
              {hash ? <EtherscanTxLink hash={hash} className="text-xs" /> : null}
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
