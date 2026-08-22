"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermitCard } from "@/components/permit-card";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { PayCharge } from "@/components/pay-charge";
import { decodeCharge, type ChargeRequest } from "@/lib/charge";
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
import { QrScanner } from "@/components/qr-scanner";
import { SectionBar } from "@/components/section-bar";
import { EtherscanTxLink } from "@/components/etherscan-link";
import { listenSound, readBluetooth } from "@/lib/air-io";
import { SaveContact } from "@/components/save-contact";
import type { Channel } from "@/lib/channels";

type Result = {
  envelope: SignedEnvelope;
  valid: boolean;
  reason?: string;
  recovered?: string;
};

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

export function ReceiveFlow() {
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
      setError(
        err instanceof Error
          ? `${err.message} Si te mandaron el .json por Bluetooth, elegilo abajo.`
          : "Bluetooth falló",
      );
    }
  }

  const envelope = result?.envelope;
  const tokenLabel = envelope
    ? `${tokenByAddress(envelope.token)?.symbol ?? envelope.token} · ${envelope.kind}`
    : "";

  return (
    <div className="mx-auto w-full max-w-lg pb-6">
    <div className="space-y-3 pb-2 md:space-y-4">
      <Tabs defaultValue="me">
        <SectionBar>
          <TabsList>
            <TabsTrigger value="me" className="cursor-pointer">
              Address
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
                      Enviar por Permit2
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
                        Enviar permit()
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
            {scanning ? "Parar cámara" : "Escanear QR o luz"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => void onListen()}>
              {listening ? "Parar oído" : "Escuchar"}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => void onBle()}>
              Bluetooth
            </Button>
          </div>
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={3}
            placeholder="O pegá el JSON acá"
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
            Validar JSON
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
