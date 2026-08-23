"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAddress } from "ethers";
import { ClipboardPaste, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressInput } from "@/components/address-input";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChannelPanel } from "@/components/channel-panel";
import { ChannelRow } from "@/components/channel-row";
import { QvacHint } from "@/components/qvac-hint";
import { ContactPicker } from "@/components/contact-picker";
import { SaveContact } from "@/components/save-contact";
import { UnitToggle } from "@/components/unit-toggle";
import { UsdtLogo } from "@/components/usdt-logo";
import { Price } from "@/components/price";
import { fiatToUsdt, formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { fiatMeta, fiatPrefix } from "@/lib/display";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { useUsdtBalance } from "@/components/use-usdt-balance";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { toBaseUnits } from "@/lib/agent";
import { encodeEnvelopeQr } from "@/lib/envelope-pack";
import { type SignedEnvelope } from "@/lib/payload";
import { payloadToDataUrl } from "@/lib/qr";
import { notifyPeer } from "@/lib/notify";
import { receiptFromPermit } from "@/lib/receipts";
import { buildPermit2, ensurePermit2Allowance } from "@/lib/permit2";
import { USDT } from "@/lib/tokens";
import { parsePaymentAddress } from "@/lib/payment-address";

import { isEnsName, resolveEns } from "@/lib/ens";
import type { AgentPermit } from "@/lib/agent";
import type { Channel } from "@/lib/channels";
import dynamic from "next/dynamic";

const QrScanner = dynamic(() => import("@/components/qr-scanner").then((m) => m.QrScanner), {
  ssr: false,
});

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
  const { wallet, error: walletError, connected } = useWallet();
  const { needsSwitch, ensure } = usePaymentChain();
  const { usdt } = useUsdtBalance(wallet?.address);
  const { prefs } = useDisplay();
  const fx = useFx();
  const search = useSearchParams();
  const retryAmount = search.get("amount");
  const [to, setTo] = useState(() => search.get("to") ?? "");
  const [unit, setUnit] = useState<"fiat" | "usdt">(retryAmount ? "usdt" : prefs.primary);
  const [amountInput, setAmountInput] = useState(() => retryAmount ?? "");
  const [exactUsdt, setExactUsdt] = useState<string | null>(retryAmount);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<SignedEnvelope | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sent, setSent] = useState<Channel | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState<Exclude<Channel, "online"> | null>(null);

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
    const value = toBaseUnits(amount, USDT.decimals);
    setBusy(true);
    setError(null);
    setHash(null);
    try {
      await ensure();
      const tx = await wallet.transfer(USDT.address, dest, value);
      setHash(tx);
      receiptFromPermit(
        { owner: wallet.address, spender: dest, value, token: USDT.symbol },
        { action: "sent", channel: "online", signature: tx, valid: true },
      );
      void notifyPeer(
        { kind: "usdt", from: wallet.address, to: dest, amount, token: "USDT" },
        (typed) => wallet.signTypedData(typed),
      );
      setSavedTo(dest);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo enviar. Hace falta USDT para el gas (paymaster) y saldo del token.";
      setError(message);
      receiptFromPermit(
        { owner: wallet.address, spender: dest, value, token: USDT.symbol },
        { action: "failed", channel: "online", signature: "", valid: false, error: message },
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOffline() {
    if (!wallet) return;
    const dest = await destination();
    if (!dest || !isAddress(dest)) {
      setError("Address, ENS o Basename inválido");
      return;
    }
    const nextDraft = draftFromForm(wallet.address, dest, amount);
    setTo(dest);
    setBusy(true);
    setError(null);
    try {
      await ensurePermit2Allowance(wallet);
      const signature = await wallet.signTypedData({
        domain: nextDraft.typed.domain,
        types: nextDraft.typed.types,
        message: nextDraft.typed.message as unknown as Record<string, unknown>,
      });
      const next: SignedEnvelope = {
        v: 1,
        kind: nextDraft.kind,
        owner: nextDraft.owner,
        spender: nextDraft.spender,
        token: nextDraft.token.address,
        value: nextDraft.value,
        typedData: {
          domain: nextDraft.typed.domain,
          types: nextDraft.typed.types,
          primaryType: nextDraft.typed.primaryType,
          message: nextDraft.typed.message as unknown as Record<string, unknown>,
        },
        signature,
        explanation: nextDraft.explanation,
        complianceNote: nextDraft.complianceNote,
      };
      setEnvelope(next);
      setQrUrl(await payloadToDataUrl(encodeEnvelopeQr(next)));
      setSavedTo(nextDraft.spender);
      receiptFromPermit(
        { owner: nextDraft.owner, spender: nextDraft.spender, value: nextDraft.value, token: nextDraft.token.symbol },
        { action: "signed", channel: "qr", signature, valid: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo firmar");
    } finally {
      setBusy(false);
    }
  }

  function pay() {
    void sendOnline();
  }

  function pickOffline(channel: Exclude<Channel, "online">) {
    setAutoStart(channel);
    if (!envelope) void signOffline();
  }

  const amount =
    exactUsdt ??
    (amountInput.trim()
      ? unit === "usdt"
        ? amountInput.trim()
        : fiatToUsdt(amountInput, fx.perUsdt)
      : "");
  const hasBalance = Boolean(usdt && Number(usdt) > 0);
  const canPay = Boolean(wallet && !busy && to && amount && Number(amount) > 0);
  const canOffline = canPay;
  const payLabel = busy ? (
    "Enviando…"
  ) : (
    <span className="inline-flex items-center gap-2">
      Enviar
      <UsdtLogo className="size-4" />
    </span>
  );

  function setFromUsdt(value: string) {
    setExactUsdt(value);
    if (unit === "usdt") setAmountInput(value);
    else setAmountInput(value ? String(Math.round(usdtToFiat(value, fx.perUsdt))) : "");
  }

  function switchUnit(next: "fiat" | "usdt") {
    if (next === unit) return;
    const current = amount;
    setUnit(next);
    if (!current || Number(current) <= 0) {
      setAmountInput("");
      setExactUsdt(null);
      return;
    }
    setExactUsdt(current);
    if (next === "usdt") setAmountInput(current);
    else setAmountInput(String(Math.round(usdtToFiat(current, fx.perUsdt))));
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-6">
      <div className="space-y-3 pb-2 md:space-y-4">
        <div className="space-y-6">
          {wallet ? (
            <QvacHint
              task="send"
              owner={wallet.address}
              label="En una frase"
              placeholder="mandale 10 USDT a lulox.eth"
              onFill={(intent) => {
                if (intent.to) setTo(intent.to);
                if (intent.amount) setFromUsdt(intent.amount);
              }}
            />
          ) : null}

          <section className="space-y-2">
            <p className="text-sm font-medium">Destinatario</p>
            <AddressInput value={to} onChange={setTo} className="flex-none w-full" />
          </section>

          <section className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-11 min-w-0 flex-1 gap-1.5 px-3"
                onClick={() => void pasteAddress()}
              >
                <ClipboardPaste className="size-4" />
                Pegar
              </Button>
              <Button
                type="button"
                variant={scanning ? "default" : "secondary"}
                className="h-11 min-w-0 flex-1 gap-1.5 px-3"
                onClick={() => {
                  setScanning((value) => !value);
                  setError(null);
                }}
              >
                <ScanLine className="size-4" />
                QR
              </Button>
              <ContactPicker
                selected={to}
                className="h-11 min-w-0 flex-1"
                onPick={(contact) => setTo(contact.address)}
              />
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
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium">Monto</p>
              <span className="text-xs text-muted-foreground">
                {usdt == null ? (
                  "Saldo —"
                ) : (
                  <span className="inline-flex items-center gap-1">
                    Saldo <Price usdt={usdt} size="sm" />
                  </span>
                )}
              </span>
            </div>
            <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-inset focus-within:ring-ring/50 dark:bg-input/30">
              <span className="pl-3 text-sm text-muted-foreground" aria-hidden="true">
                {unit === "fiat" ? fiatPrefix(prefs.fiat) : null}
                {unit === "usdt" ? <UsdtLogo className="size-4" /> : null}
              </span>
              <Input
                inputMode="decimal"
                value={amountInput}
                onChange={(event) => {
                  setExactUsdt(null);
                  setAmountInput(event.target.value);
                }}
                placeholder="0"
                className="h-11 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                aria-label={unit === "usdt" ? "Monto en USDT" : `Monto en ${fiatMeta(prefs.fiat).name}`}
              />
              <UnitToggle value={unit} fiatLabel={prefs.fiat} onChange={switchUnit} className="mr-1" />
            </div>
            {amount && Number(amount) > 0 ? (
              <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                {unit === "fiat" ? (
                  <>
                    {formatUsdt(amount, 6)}
                    <UsdtLogo className="size-3" />
                  </>
                ) : (
                  formatFiat(usdtToFiat(amount, fx.perUsdt), prefs.fiat)
                )}
              </p>
            ) : null}
            <div className="flex gap-2">
              {[25, 50, 75].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1"
                  disabled={!hasBalance}
                  onClick={() => setFromUsdt(takePercent(usdt ?? "0", pct / 100))}
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
                onClick={() => setFromUsdt(usdt ?? "")}
              >
                MAX
              </Button>
            </div>
          </section>
        </div>

        <div className="space-y-3">
          {!wallet && !connected ? (
            <div className="[&_button]:cursor-pointer">
              <ConnectButton label="Conectar wallet" />
            </div>
          ) : null}
          {needsSwitch ? (
            <p className="text-xs text-muted-foreground">Al enviar on-chain te va a pedir cambiar a Ethereum.</p>
          ) : null}
          <Button type="button" className="h-12 w-full" disabled={!canPay} onClick={() => pay()}>
            {payLabel}
          </Button>
          {hash ? (
            <div className="space-y-1">
              <p className="break-all font-mono text-[11px] text-muted-foreground">Tx {hash}</p>
              <EtherscanTxLink hash={hash} className="text-xs" />
            </div>
          ) : null}
          <div className="space-y-2 pt-1">
            <p className="text-sm font-medium">Sin internet</p>
            <p className="text-xs text-muted-foreground">QR, sonido, luz, Bluetooth, NFC, copiar o archivo.</p>
            {envelope ? (
              <>
                <ChannelPanel
                  envelope={envelope}
                  qrUrl={qrUrl}
                  onSent={setSent}
                  autoStart={autoStart}
                />
                {sent ? <p className="text-xs text-primary">Guardado en actividad.</p> : null}
              </>
            ) : (
              <ChannelRow busy={busy || !canOffline} onPick={(id) => void pickOffline(id)} />
            )}
          </div>
          {savedTo ? (
            <SaveContact
              address={savedTo}
              hint={hash ? "Le acabás de enviar" : "Le armaste este permiso"}
            />
          ) : null}
        </div>

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
