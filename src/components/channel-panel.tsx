"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allChannelStatuses, type Channel } from "@/lib/channels";
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
  const [optical, setOptical] = useState(false);
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
        await markSent("qr", "Show this QR to the receiving device.");
        return;
      }
      if (channel === "copy") {
        await navigator.clipboard.writeText(payload);
        await markSent("copy", "Signed payload copied.");
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
        await markSent("file", "Permit file downloaded.");
        return;
      }
      if (channel === "ble") {
        const bluetooth = (navigator as Navigator & {
          bluetooth?: { requestDevice: (opts: { acceptAllDevices: boolean }) => Promise<unknown> };
        }).bluetooth;
        if (!bluetooth) throw new Error("Web Bluetooth unavailable");
        await bluetooth.requestDevice({ acceptAllDevices: true });
        await markSent("ble", "Bluetooth picker opened. No Walinox GATT peer in this MVP.");
        return;
      }
      if (channel === "nfc") {
        const NDEF = (window as Window & { NDEFReader?: new () => { write: (data: unknown) => Promise<void> } }).NDEFReader;
        if (!NDEF) throw new Error("Web NFC unavailable");
        await new NDEF().write({ records: [{ recordType: "text", data: payload }] });
        await markSent("nfc", "Wrote the permit to an NFC tag.");
        return;
      }
      if (channel === "ultrasonic") {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) throw new Error("Web Audio unavailable");
        const ctx = new Ctx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.frequency.value = 18000;
        gain.gain.value = 0.04;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.6);
        await markSent("ultrasonic", "Played a short ultrasonic burst. Use QR if the peer cannot hear it.");
        return;
      }
      if (channel === "optical") {
        setOptical(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setOptical(false);
        await markSent("optical", "Flashed the screen. Pair with QR for a reliable demo.");
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Channel failed");
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
            disabled={!channel.available && channel.id !== "qr"}
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
      {optical ? (
        <div className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-white" />
      ) : null}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        QR, copy, and file are the reliable demo paths. Bluetooth, NFC, sound, and light
        are offered when the browser allows them.
      </p>
    </div>
  );
}
