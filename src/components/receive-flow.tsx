"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { OfflineSend } from "@/components/offline-send";
import { Price } from "@/components/price";
import { UsdtLogo } from "@/components/usdt-logo";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { PayCharge } from "@/components/pay-charge";
import {
  buildCharge,
  decodeCharge,
  encodeCharge,
  type ChargeRequest,
} from "@/lib/charge";
import { fiatMeta, fiatPrefix } from "@/lib/display";
import { fiatToUsdt, formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { decodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { broadcastPermit, encodePermitCall, validatePermitSignature, type PermitTypedData } from "@/lib/permit";
import {
  buildPermit2,
  encodePermit2TransferFrom,
  validatePermit2Signature,
} from "@/lib/permit2";
import { receiptFromPermit } from "@/lib/receipts";
import { tokenByAddress } from "@/lib/tokens";
import { payloadToDataUrl } from "@/lib/qr";
import { shortAddress } from "@/lib/format";
import dynamic from "next/dynamic";
import { SectionBar } from "@/components/section-bar";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { listenSound, readBluetooth } from "@/lib/air-io";
import { SaveContact } from "@/components/save-contact";
import type { Channel } from "@/lib/channels";
import { cn } from "@/lib/utils";

const QrScanner = dynamic(() => import("@/components/qr-scanner").then((m) => m.QrScanner), {
  ssr: false,
});

type Result = {
  envelope: SignedEnvelope;
  valid: boolean;
  reason?: string;
  recovered?: string;
};

type Focus = "me" | "pedir" | "scan";

function ingest(raw: string, channel: Channel): Result {
  const envelope = decodeEnvelope(raw);
  const check =
    envelope.kind === "permit2"
      ? validatePermit2Signature(
          buildPermit2({
            token: envelope.token,
            spender: envelope.spender,
            amount: envelope.value,
            nonce: String(envelope.typedData.message.nonce ?? ""),
            deadline: String(envelope.typedData.message.deadline ?? ""),
            chainId: envelope.typedData.domain.chainId,
          }),
          envelope.signature,
          envelope.owner,
        )
      : validatePermitSignature(
          envelope.typedData as unknown as PermitTypedData,
          envelope.signature,
        );
  receiptFromPermit(
    {
      owner: envelope.owner,
      spender: envelope.spender,
      value: envelope.value,
      token: envelope.token,
    },
    {
      action: "received",
      channel,
      signature: envelope.signature,
      valid: check.ok,
      digest: check.digest,
    },
  );
  return {
    envelope,
    valid: check.ok,
    reason: check.ok ? undefined : check.reason,
    recovered: check.recovered,
  };
}

export function ReceiveFlow({ focus = "me" }: { focus?: Focus }) {
  const { wallet } = useWallet();
  const { ensure } = usePaymentChain();
  const { prefs } = useDisplay();
  const fx = useFx();
  const [addressQr, setAddressQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [scanning, setScanning] = useState(focus === "scan");
  const [listening, setListening] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenAbort = useRef<AbortController | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [charge, setCharge] = useState<ChargeRequest | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [askUnit, setAskUnit] = useState<"fiat" | "usdt">(prefs.primary);
  const [askAmountInput, setAskAmountInput] = useState("");
  const [askExactUsdt, setAskExactUsdt] = useState<string | null>(null);
  const [askNote, setAskNote] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askCharge, setAskCharge] = useState<ChargeRequest | null>(null);
  const [askQr, setAskQr] = useState<string | null>(null);

  const askAmount =
    askExactUsdt ??
    (askAmountInput.trim()
      ? askUnit === "usdt"
        ? askAmountInput.trim()
        : fiatToUsdt(askAmountInput, fx.perUsdt)
      : "");

  useEffect(() => {
    if (!wallet) return;
    void payloadToDataUrl(wallet.address).then(setAddressQr);
  }, [wallet]);

  useEffect(() => {
    return () => listenAbort.current?.abort();
  }, []);

  function takePayload(raw: string, channel: Channel) {
    try {
      const nextCharge = decodeCharge(raw);
      if (nextCharge) {
        setCharge(nextCharge);
        setResult(null);
      } else {
        setCharge(null);
        setResult(ingest(raw, channel));
      }
      setError(null);
      setScanning(false);
      setListening(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payload inválido");
    }
  }

  async function onListen() {
    if (listening) {
      listenAbort.current?.abort();
      return;
    }
    setListening(true);
    setScanning(false);
    setError(null);
    const ac = new AbortController();
    listenAbort.current = ac;
    try {
      const raw = await listenSound({ signal: ac.signal });
      takePayload(raw, "ultrasonic");
    } catch (err) {
      if (!ac.signal.aborted) {
        setError(err instanceof Error ? err.message : "No se oyó nada");
      }
    } finally {
      setListening(false);
      listenAbort.current = null;
    }
  }

  async function onBle() {
    setError(null);
    setScanning(false);
    listenAbort.current?.abort();
    try {
      takePayload(await readBluetooth(), "ble");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bluetooth falló");
    }
  }

  function switchAskUnit(next: "fiat" | "usdt") {
    if (next === askUnit) return;
    const current = askAmount;
    setAskUnit(next);
    if (!current || Number(current) <= 0) {
      setAskAmountInput("");
      setAskExactUsdt(null);
      return;
    }
    setAskExactUsdt(current);
    if (next === "usdt") setAskAmountInput(current);
    else setAskAmountInput(String(Math.round(usdtToFiat(current, fx.perUsdt))));
  }

  async function makeRequest() {
    if (!wallet) return;
    const amount = askAmount.trim();
    if (!amount || Number(amount) <= 0) {
      setError("Monto inválido");
      return;
    }
    setAskBusy(true);
    setError(null);
    try {
      const note = askNote.trim() || "Pedido";
      const next = buildCharge({
        to: wallet.address,
        store: note,
        items: [{ productId: "request", title: note, price: amount, qty: 1 }],
      });
      setAskCharge(next);
      setAskQr(await payloadToDataUrl(encodeCharge(next)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el pedido");
    } finally {
      setAskBusy(false);
    }
  }

  const envelope = result?.envelope;
  const tokenLabel = envelope
    ? `${tokenByAddress(envelope.token)?.symbol ?? envelope.token} · ${envelope.kind}`
    : "";

  return (
    <div className="mx-auto w-full max-w-lg pb-6">
      <div className="space-y-3 pb-2 md:space-y-4">
        <Tabs defaultValue={focus}>
          <SectionBar>
            <TabsList>
              <TabsTrigger value="me" className="cursor-pointer">
                Address
              </TabsTrigger>
              <TabsTrigger value="pedir" className="cursor-pointer">
                Pedir
              </TabsTrigger>
              <TabsTrigger value="scan" className="cursor-pointer">
                Escanear
              </TabsTrigger>
            </TabsList>
          </SectionBar>

          <TabsContent value="me" className="mt-4 space-y-3">
            {addressQr ? (
              <div className="overflow-hidden rounded-3xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={addressQr} alt="Tu address" className="mx-auto h-44 w-44 md:h-48 md:w-48" />
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center rounded-3xl bg-muted text-sm text-muted-foreground md:h-48">
                Generando QR…
              </div>
            )}
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              {wallet ? wallet.address : "…"}
            </p>
            <Button
              type="button"
              className="h-11 w-full"
              disabled={!wallet}
              onClick={() => {
                if (!wallet) return;
                void navigator.clipboard.writeText(wallet.address).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                });
              }}
            >
              {copied ? "Copiada" : "Copiar address"}
            </Button>
          </TabsContent>

          <TabsContent value="pedir" className="mt-4 space-y-3">
            {askCharge ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="h-9 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setAskCharge(null);
                    setAskQr(null);
                  }}
                >
                  Cambiar monto
                </button>
                <div className="rounded-2xl border border-border px-4 py-3">
                  <p className="text-[11px] text-muted-foreground">{askCharge.store}</p>
                  <Price usdt={askCharge.amount} size="lg" />
                </div>
                <OfflineSend
                  payload={encodeCharge(askCharge)}
                  qrUrl={askQr}
                  filename="walinox-pedido.json"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Monto</p>
                  <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-inset focus-within:ring-ring/50 dark:bg-input/30">
                    <span className="pl-3 text-sm text-muted-foreground" aria-hidden="true">
                      {askUnit === "fiat" ? fiatPrefix(prefs.fiat) : null}
                      {askUnit === "usdt" ? <UsdtLogo className="size-4" /> : null}
                    </span>
                    <Input
                      inputMode="decimal"
                      value={askAmountInput}
                      onChange={(event) => {
                        setAskExactUsdt(null);
                        setAskAmountInput(event.target.value);
                      }}
                      placeholder="0"
                      className="h-11 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                      aria-label={
                        askUnit === "usdt" ? "Monto en USDT" : `Monto en ${fiatMeta(prefs.fiat).name}`
                      }
                    />
                    <select
                      className="h-11 w-[5.4rem] shrink-0 cursor-pointer border-0 bg-transparent pr-2 text-sm text-muted-foreground"
                      value={askUnit}
                      aria-label="Moneda del pedido"
                      onChange={(event) => switchAskUnit(event.target.value === "usdt" ? "usdt" : "fiat")}
                    >
                      <option value="fiat">{prefs.fiat}</option>
                      <option value="usdt">USDT</option>
                    </select>
                  </div>
                  {askAmount && Number(askAmount) > 0 ? (
                    <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      {askUnit === "fiat" ? (
                        <>
                          {formatUsdt(askAmount, 6)}
                          <UsdtLogo className="size-3" />
                        </>
                      ) : (
                        formatFiat(usdtToFiat(askAmount, fx.perUsdt), prefs.fiat)
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Nota</p>
                  <Input
                    value={askNote}
                    onChange={(event) => setAskNote(event.target.value)}
                    placeholder="Café, alquiler…"
                    className="h-11"
                  />
                </div>
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={!wallet || askBusy || !askAmount.trim()}
                  onClick={() => void makeRequest()}
                >
                  {askBusy ? "Armando…" : "Generar pedido"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scan" className="mt-4 space-y-3">
            {charge ? (
              <PayCharge
                charge={charge}
                onBack={() => {
                  setCharge(null);
                  setResult(null);
                }}
              />
            ) : result && envelope ? (
              <div className="space-y-3">
                <p className={result.valid ? "text-sm font-medium text-primary" : "text-sm font-medium text-destructive"}>
                  {result.valid
                    ? `Firma válida · ${shortAddress(envelope.owner)}`
                    : `Firma inválida${result.reason ? `: ${result.reason}` : ""}`}
                </p>
                <PermitCard
                  kind={envelope.kind}
                  owner={envelope.owner}
                  spender={envelope.spender}
                  value={envelope.value}
                  tokenLabel={tokenLabel}
                  nonce={String(envelope.typedData.message.nonce ?? "")}
                  deadline={String(envelope.typedData.message.deadline ?? "")}
                  chainId={envelope.typedData.domain.chainId}
                  explanation={envelope.explanation}
                  complianceNote={envelope.complianceNote}
                />
                {result.valid ? (
                  <div className="space-y-2">
                    {envelope.kind === "permit2" ? (
                      <Button
                        type="button"
                        className="h-11 w-full"
                        disabled={!wallet}
                        onClick={() => {
                          if (!wallet) return;
                          const { to, data } = encodePermit2TransferFrom(
                            buildPermit2({
                              token: envelope.token,
                              spender: envelope.spender,
                              amount: envelope.value,
                              nonce: String(envelope.typedData.message.nonce ?? ""),
                              deadline: String(envelope.typedData.message.deadline ?? ""),
                              chainId: envelope.typedData.domain.chainId,
                            }),
                            envelope.signature,
                            envelope.owner,
                          );
                          void ensure()
                            .then(() => wallet.sendCalldata(to, data))
                            .then(setTx)
                            .catch((err: unknown) =>
                              setError(err instanceof Error ? err.message : "Falló el envío"),
                            );
                        }}
                      >
                        Confirmar cobro
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          className="h-11 w-full"
                          disabled={!wallet}
                          onClick={() => {
                            if (!wallet) return;
                            void ensure()
                              .then(() =>
                                broadcastPermit(
                                  envelope.typedData as unknown as PermitTypedData,
                                  envelope.signature,
                                  (to, data) => wallet.sendCalldata(to, data),
                                ),
                              )
                              .then(setTx)
                              .catch((err: unknown) =>
                                setError(err instanceof Error ? err.message : "Falló el envío"),
                              );
                          }}
                        >
                          Confirmar cobro
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full"
                          onClick={() => {
                            const { data } = encodePermitCall(
                              envelope.typedData as unknown as PermitTypedData,
                              envelope.signature,
                            );
                            void navigator.clipboard.writeText(data);
                            setTx("calldata copiado");
                          }}
                        >
                          Copiar calldata
                        </Button>
                      </>
                    )}
                    {tx ? (
                      <div className="space-y-1">
                        <p className="break-all font-mono text-[11px] text-muted-foreground">{tx}</p>
                        <EtherscanTxLink hash={tx} className="text-xs" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {result.valid &&
                envelope.owner &&
                wallet?.address.toLowerCase() !== envelope.owner.toLowerCase() ? (
                  <SaveContact address={envelope.owner} hint="Te mandó este permiso" />
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => {
                    setResult(null);
                    setTx(null);
                  }}
                >
                  Escanear otro
                </Button>
              </div>
            ) : (
              <>
                <QrScanner
                  active={scanning}
                  onResult={(text) => takePayload(text, "qr")}
                  onError={(message) => {
                    setError(message);
                    setScanning(false);
                  }}
                />
                <Button
                  type="button"
                  className="h-12 w-full"
                  onClick={() => {
                    listenAbort.current?.abort();
                    setScanning((value) => !value);
                  }}
                >
                  {scanning ? "Parar cámara" : "Escanear QR"}
                </Button>

                <button
                  type="button"
                  className="flex h-9 w-full cursor-pointer items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setMore((value) => !value)}
                >
                  Más canales
                  <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} />
                </button>

                {more ? (
                  <div className="space-y-2 rounded-2xl border border-border p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" className="h-11" onClick={() => void onListen()}>
                        {listening ? "Parar" : "Escuchar"}
                      </Button>
                      <Button type="button" variant="outline" className="h-11" onClick={() => void onBle()}>
                        Bluetooth
                      </Button>
                    </div>
                    <Textarea
                      value={pasted}
                      onChange={(event) => setPasted(event.target.value)}
                      rows={2}
                      placeholder="Pegá el JSON"
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full"
                      onClick={() => {
                        try {
                          const nextCharge = decodeCharge(pasted);
                          if (nextCharge) {
                            setCharge(nextCharge);
                            setResult(null);
                          } else {
                            setCharge(null);
                            setResult(ingest(pasted, "copy"));
                          }
                          setError(null);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "JSON inválido");
                        }
                      }}
                    >
                      Validar texto
                    </Button>
                    <Input
                      type="file"
                      accept="application/json,.json"
                      className="cursor-pointer text-xs"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void file.text().then((text) => {
                          try {
                            const nextCharge = decodeCharge(text);
                            if (nextCharge) {
                              setCharge(nextCharge);
                              setResult(null);
                            } else {
                              setCharge(null);
                              setResult(ingest(text, "file"));
                            }
                            setError(null);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Archivo inválido");
                          }
                        });
                      }}
                    />
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>
        </Tabs>

        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
