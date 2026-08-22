"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfflineSend } from "@/components/offline-send";
import { PermitCard } from "@/components/permit-card";
import { Price } from "@/components/price";
import { QrScanner } from "@/components/qr-scanner";
import { usePaymentChain } from "@/components/use-payment-chain";
import { useWallet } from "@/components/wallet-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isLocalHost } from "@/lib/dev";
import {
  buildCharge,
  decodeCharge,
  encodeCharge,
  linesFromBasket,
  totalUsdt,
  type ChargeRequest,
} from "@/lib/charge";
import { decodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import {
  buildPermit2,
  encodePermit2TransferFrom,
  validatePermit2Signature,
} from "@/lib/permit2";
import { payloadToDataUrl } from "@/lib/qr";
import { receiptFromPermit } from "@/lib/receipts";
import { EtherscanTxLink } from "@/components/etherscan-link";
import type { Product } from "@/lib/vale";

export function PosView({ products }: { products: Product[] }) {
  const { wallet } = useWallet();
  const { ensure } = usePaymentChain();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"menu" | "charge" | "confirm">("menu");
  const [charge, setCharge] = useState<ChargeRequest | null>(null);
  const [chargeQr, setChargeQr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [envelope, setEnvelope] = useState<SignedEnvelope | null>(null);
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => linesFromBasket(products, qty), [products, qty]);
  const amount = totalUsdt(items);

  function bump(id: string, delta: number) {
    setQty((current) => {
      const next = Math.max(0, (current[id] ?? 0) + delta);
      const copy = { ...current };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function cobrar() {
    if (!wallet) return;
    setError(null);
    try {
      const next = buildCharge({
        to: wallet.address,
        store: products[0]?.issuerName ?? "Mi local",
        items,
      });
      setCharge(next);
      setChargeQr(await payloadToDataUrl(encodeCharge(next)));
      setEnvelope(null);
      setHash(null);
      setStep("charge");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo armar el cobro");
    }
  }

  function ingest(raw: string) {
    try {
      if (decodeCharge(raw)) {
        setError("Eso es el pedido. Escaneá la firma del cliente.");
        return;
      }
      const next = decodeEnvelope(raw);
      const check = validatePermit2Signature(
        buildPermit2({
          token: next.token,
          spender: next.spender,
          amount: next.value,
          nonce: String(next.typedData.message.nonce ?? ""),
          deadline: String(next.typedData.message.deadline ?? ""),
          chainId: next.typedData.domain.chainId,
        }),
        next.signature,
        next.owner,
      );
      if (wallet && next.spender.toLowerCase() !== wallet.address.toLowerCase()) {
        setError("Ese permiso no es para este local");
        return;
      }
      setEnvelope(next);
      setValid(check.ok);
      setScanning(false);
      setError(check.ok ? null : check.reason ?? "Firma inválida");
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR inválido");
    }
  }

  async function confirm() {
    if (!wallet || !envelope || !valid) return;
    setBusy(true);
    setError(null);
    try {
      let tx = "demo";
      if (!isLocalHost()) {
        await ensure();
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
        tx = await wallet.sendCalldata(to, data);
      }
      setHash(tx);
      receiptFromPermit(
        {
          owner: envelope.owner,
          spender: envelope.spender,
          value: envelope.value,
          token: "USDT",
        },
        { action: "received", channel: "qr", signature: tx, valid: true },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar el pago");
    } finally {
      setBusy(false);
    }
  }

  if (step === "charge") {
    return (
      <div className="space-y-3">
        <button type="button" className="cursor-pointer text-xs text-primary" onClick={() => setStep("menu")}>
          Volver al pedido
        </button>
        <p className="text-sm">Mostrale el pedido. El cliente firma sin internet.</p>
        <div className="rounded-2xl border border-border px-3 py-2">
          <Price usdt={amount} size="lg" />
        </div>
        <OfflineSend
          payload={charge ? encodeCharge(charge) : ""}
          qrUrl={chargeQr}
          filename="walinox-pedido.json"
        />
        <Button type="button" className="h-11 w-full" onClick={() => setScanning((value) => !value)}>
          {scanning ? "Cerrar cámara" : "Ya firmó · escanear pago"}
        </Button>
        <QrScanner
          active={scanning}
          onResult={ingest}
          onError={(message) => {
            setError(message);
            setScanning(false);
          }}
        />
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  if (step === "confirm" && envelope) {
    return (
      <div className="space-y-3">
        <button type="button" className="cursor-pointer text-xs text-primary" onClick={() => setStep("charge")}>
          Volver al cobro
        </button>
        <p className={valid ? "text-sm text-primary" : "text-sm text-destructive"}>
          {valid ? "Firma lista. Publicá el pago con internet." : "Firma inválida"}
        </p>
        <PermitCard
          kind={envelope.kind}
          owner={envelope.owner}
          spender={envelope.spender}
          value={envelope.value}
          tokenLabel="USDT"
          nonce={String(envelope.typedData.message.nonce ?? "")}
          deadline={String(envelope.typedData.message.deadline ?? "")}
          chainId={envelope.typedData.domain.chainId}
        />
        <Button type="button" className="h-12 w-full" disabled={!valid || busy} onClick={() => void confirm()}>
          {busy ? "Publicando…" : "Confirmar pago on-chain"}
        </Button>
        {hash ? (
          <div className="space-y-1">
            <p className="text-sm text-primary">{isLocalHost() ? "Cobro de demo registrado." : "Pago publicado."}</p>
            {hash !== "demo" ? <EtherscanTxLink hash={hash} className="text-xs" /> : null}
          </div>
        ) : null}
        {error ? (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Caja</p>
      <p className="text-xs text-muted-foreground">Armá el pedido. El cliente paga sin red. Vos confirmás on-chain.</p>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Publicá productos para cobrarlos acá.</p>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => {
            const count = qty[product.id] ?? 0;
            return (
              <li key={product.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="size-12 shrink-0 rounded-xl bg-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{product.title}</span>
                  <Price usdt={product.price} size="sm" />
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-8"
                    disabled={count === 0}
                    onClick={() => bump(product.id, -1)}
                    aria-label="Quitar"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">{count}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-8"
                    onClick={() => bump(product.id, 1)}
                    aria-label="Agregar"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="rounded-2xl border border-border px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Pedido</p>
        <Price usdt={amount} size="md" />
      </div>
      <Button type="button" className="h-12 w-full" disabled={!wallet || items.length === 0} onClick={() => void cobrar()}>
        Cobrar
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
