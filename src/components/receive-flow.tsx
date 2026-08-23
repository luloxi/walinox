"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { OfflineSend } from "@/components/offline-send";
import { Price } from "@/components/price";
import { UsdtLogo } from "@/components/usdt-logo";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { PayCharge } from "@/components/pay-charge";
import {
  buildCharge,
  decodeCharge,
  encodeCharge,
  type ChargeRequest,
} from "@/lib/charge";
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
  const [addressQr, setAddressQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [scanning, setScanning] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listenAbort = useRef<AbortController | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [charge, setCharge] = useState<ChargeRequest | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [askAmount, setAskAmount] = useState("");
  const [askNote, setAskNote] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askCharge, setAskCharge] = useState<ChargeRequest | null>(null);
  const [askQr, setAskQr] = useState<string | null>(null);

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
              <div className="overflow-hidden rounded-3xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={addressQr} alt="Tu address" className="mx-auto h-40 w-40 md:h-44 md:w-44" />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-3xl bg-muted text-sm text-muted-foreground md:h-44">
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
              {copied ? "Address copiada" : "Copiar address"}
            </Button>
          </TabsContent>

          <TabsContent value="pedir" className="mt-4 space-y-3">
            {askCharge ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="cursor-pointer text-xs text-primary"
                  onClick={() => {
                    setAskCharge(null);
                    setAskQr(null);
                  }}
                >
                  Cambiar monto
                </button>
                <div className="rounded-2xl border border-border px-3 py-2">
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
                      <UsdtLogo className="size-4" />
                    </span>
                    <Input
                      inputMode="decimal"
                      value={askAmount}
                      onChange={(event) => setAskAmount(event.target.value)}
                      placeholder="0"
                      className="h-11 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                      aria-label="Monto en USDT"
                    />
                    <span className="pr-3 text-sm text-muted-foreground">USDT</span>
                  </div>
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
                <p className={result.valid ? "text-sm text-primary" : "text-sm text-red-400"}>
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
              </div>
            ) : null}

            {charge ? null : (
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
                  className="h-11 w-full"
                  onClick={() => {
                    listenAbort.current?.abort();
                    setScanning((value) => !value);
                  }}
                >
                  {scanning ? "Parar cámara" : "Escanear QR"}
                </Button>
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
                  rows={3}
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
                  Validar
                </Button>
                <Input
                  type="file"
                  accept="application/json,.json"
                  className="cursor-pointer"
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
