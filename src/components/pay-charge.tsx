"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChannelPanel } from "@/components/channel-panel";
import { Price } from "@/components/price";
import { useWallet } from "@/components/wallet-provider";
import { toBaseUnits } from "@/lib/agent";
import type { Channel } from "@/lib/channels";
import type { ChargeRequest } from "@/lib/charge";
import { encodeEnvelope, type SignedEnvelope } from "@/lib/payload";
import { buildPermit2 } from "@/lib/permit2";
import { payloadToDataUrl } from "@/lib/qr";
import { USDT } from "@/lib/tokens";

export function PayCharge({ charge, onBack }: { charge: ChargeRequest; onBack: () => void }) {
  const { wallet } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<SignedEnvelope | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sent, setSent] = useState<Channel | null>(null);

  async function sign() {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    try {
      const value = toBaseUnits(charge.amount, USDT.decimals);
      const typed = buildPermit2({
        token: USDT.address,
        spender: charge.to,
        amount: value,
      });
      const signature = await wallet.signTypedData({
        domain: typed.domain,
        types: typed.types,
        message: typed.message as unknown as Record<string, unknown>,
      });
      const next: SignedEnvelope = {
        v: 1,
        kind: "permit2",
        owner: wallet.address,
        spender: typed.message.spender,
        token: typed.message.permitted.token,
        value: typed.message.permitted.amount,
        typedData: {
          domain: typed.domain,
          types: typed.types,
          primaryType: typed.primaryType,
          message: typed.message as unknown as Record<string, unknown>,
        },
        signature,
        explanation: `Pedido en ${charge.store}.`,
        complianceNote: "USDT no tiene permit(). Se usa Permit2. El local confirma on-chain.",
      };
      setEnvelope(next);
      setQrUrl(await payloadToDataUrl(encodeEnvelope(next)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo firmar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" className="cursor-pointer text-xs text-primary" onClick={onBack}>
        Volver
      </button>
      <p className="text-sm font-medium">{charge.store}</p>
      <ul className="space-y-1 text-sm">
        {charge.items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between gap-2">
            <span>
              {item.qty} × {item.title}
            </span>
            <Price usdt={Number(item.price) * item.qty} size="sm" className="items-end" />
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-border px-3 py-2">
        <p className="text-[11px] text-muted-foreground">Total</p>
        <Price usdt={charge.amount} size="lg" />
      </div>
      {!envelope ? (
        <Button type="button" className="h-12 w-full" disabled={!wallet || busy} onClick={() => void sign()}>
          {busy ? "Firmando…" : "Firmar sin internet"}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">Pasale la firma al local. Ellos publican el pago.</p>
          <ChannelPanel envelope={envelope} qrUrl={qrUrl} onSent={setSent} />
          {sent ? <p className="text-xs text-primary">Listo. El local confirma con internet.</p> : null}
        </div>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
