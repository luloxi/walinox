"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allChannelStatuses, type Channel } from "@/lib/channels";
import { transmitChannel } from "@/lib/air-io";
import { encodeEnvelope, envelopeFilename, type SignedEnvelope } from "@/lib/payload";
import { fromBaseUnits } from "@/lib/format";
import { notifyPeer } from "@/lib/notify";
import { receiptFromPermit } from "@/lib/receipts";

type Props = {
  envelope: SignedEnvelope;
  qrUrl: string | null;
  onSent: (channel: Channel) => void;
};

export function ChannelPanel({ envelope, qrUrl, onSent }: Props) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const payload = encodeEnvelope(envelope);
  const statuses = allChannelStatuses().filter((channel) => channel.id !== "online");

  async function markSent(channel: Channel, detail: string) {
    receiptFromPermit(
      {
        owner: envelope.owner,
        spender: envelope.spender,
        value: envelope.value,
        token: envelope.token,
      },
      {
        action: "sent",
        channel,
        signature: envelope.signature,
        valid: true,
      },
    );
    setNote(detail);
    onSent(channel);
    void notifyPeer({
      kind: "permit",
      from: envelope.owner,
      to: envelope.spender,
      amount: fromBaseUnits(envelope.value),
      token: "USDT",
      url: "/?tab=recibir",
    });
  }

  async function send(channel: Channel) {
    setNote(null);
    try {
      if (channel === "qr") {
        await markSent("qr", "Mostrale este QR al otro celular.");
        return;
      }
      if (channel === "copy") {
        await navigator.clipboard.writeText(payload);
        await markSent("copy", "Permiso copiado.");
        return;
      }
      if (channel === "file") {
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = envelopeFilename(envelope);
        a.click();
        URL.revokeObjectURL(url);
        await markSent("file", "Archivo descargado.");
        return;
      }
      if (channel === "nfc") {
        const NDEF = (window as Window & { NDEFReader?: new () => { write: (data: unknown) => Promise<void> } }).NDEFReader;
        if (!NDEF) throw new Error("Web NFC no está en este navegador");
        await new NDEF().write({ records: [{ recordType: "text", data: payload }] });
        await markSent("nfc", "Permiso escrito en el tag NFC.");
        return;
      }
      if (channel === "ble" || channel === "ultrasonic" || channel === "optical") {
        setBusy(true);
        const detail = await transmitChannel(channel, payload);
        await markSent(channel, detail);
        return;
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "El canal falló");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {qrUrl ? (
        <div className="overflow-hidden rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="Signed permit QR" className="mx-auto h-64 w-64" />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
          Encoding QR…
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {statuses.map((channel) => (
          <Button
            key={channel.id}
            type="button"
            variant={channel.id === "qr" ? "default" : "outline"}
            className="h-11 justify-between"
            disabled={busy || (!channel.available && channel.id !== "qr")}
            onClick={() => void send(channel.id)}
          >
            {channel.label}
            {!channel.available ? (
              <Badge variant="secondary">n/a</Badge>
            ) : null}
          </Button>
        ))}
      </div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        QR, sonido y luz cierran el loop entre dos celulares. Bluetooth comparte el archivo (Nearby / AirDrop)
        o escribe GATT si hay un peer Walinox. NFC escribe un tag.
      </p>
    </div>
  );
}
