"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { allChannelStatuses, type Channel } from "@/lib/channels";
import { transmitChannel } from "@/lib/air-io";
import { encodeEnvelope, envelopeFilename, type SignedEnvelope } from "@/lib/payload";
import { inviteFromSeed, wrapForPears } from "@/lib/pears";
import { fromBaseUnits } from "@/lib/format";
import { notifyPeer } from "@/lib/notify";
import { receiptFromPermit } from "@/lib/receipts";

type Props = {
  envelope: SignedEnvelope;
  qrUrl: string | null;
  onSent: (channel: Channel) => void;
};

const PRIMARY: Channel[] = ["qr", "copy", "file"];

export function ChannelPanel({ envelope, qrUrl, onSent }: Props) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const statuses = allChannelStatuses().filter((channel) => channel.id !== "online");
  const primary = statuses.filter((channel) => PRIMARY.includes(channel.id));
  const extra = statuses.filter((channel) => !PRIMARY.includes(channel.id) && channel.available);

  async function offlinePayload() {
    return wrapForPears(encodeEnvelope(envelope), envelope.signature);
  }

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
        const invite = await inviteFromSeed(envelope.signature);
        await markSent("qr", `Mostrale este QR. Sala ${invite}`);
        return;
      }
      if (channel === "copy") {
        await navigator.clipboard.writeText(await offlinePayload());
        await markSent("copy", "Permiso copiado.");
        return;
      }
      if (channel === "file") {
        const blob = new Blob([await offlinePayload()], { type: "application/json" });
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
        await new NDEF().write({ records: [{ recordType: "text", data: await offlinePayload() }] });
        await markSent("nfc", "Escrito en el tag NFC.");
        return;
      }
      if (channel === "ble" || channel === "ultrasonic" || channel === "optical") {
        setBusy(true);
        const detail = await transmitChannel(channel, await offlinePayload());
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
          <img src={qrUrl} alt="Permiso firmado" className="mx-auto h-64 w-64" />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
          Armando QR…
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {primary.map((channel) => (
          <Button
            key={channel.id}
            type="button"
            variant={channel.id === "qr" ? "default" : "outline"}
            className="h-11"
            disabled={busy}
            onClick={() => void send(channel.id)}
          >
            {channel.label}
          </Button>
        ))}
      </div>
      {extra.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMore((value) => !value)}
          >
            {more ? "Menos canales" : "Más canales"}
          </button>
          {more ? (
            <div className="grid grid-cols-2 gap-2">
              {extra.map((channel) => (
                <Button
                  key={channel.id}
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() => void send(channel.id)}
                >
                  {channel.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
