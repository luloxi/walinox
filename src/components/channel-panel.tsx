"use client";

import { useState } from "react";
import { ChannelRow, SoundPlayback } from "@/components/channel-row";
import { useWallet } from "@/components/wallet-provider";
import { playSound, transmitChannel } from "@/lib/air-io";
import { type Channel } from "@/lib/channels";
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

export function ChannelPanel({ envelope, qrUrl, onSent }: Props) {
  const { wallet } = useWallet();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Exclude<Channel, "online"> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);

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
    if (wallet) {
      void notifyPeer(
        {
          kind: "permit",
          from: envelope.owner,
          to: envelope.spender,
          amount: fromBaseUnits(envelope.value),
          token: "USDT",
          url: "/?tab=recibir",
        },
        (typed) => wallet.signTypedData(typed),
      );
    }
  }

  async function replaySound() {
    setPlaying(true);
    setNote(null);
    try {
      await playSound(encodeEnvelope(envelope));
    } catch (error) {
      setNote(error instanceof Error ? error.message : "El canal falló");
    } finally {
      setPlaying(false);
    }
  }

  async function send(channel: Exclude<Channel, "online">) {
    setNote(null);
    setActive(channel);
    if (channel !== "ultrasonic") setSoundOpen(false);
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
      if (channel === "ultrasonic") {
        setBusy(true);
        setSoundOpen(true);
        setPlaying(true);
        await playSound(encodeEnvelope(envelope));
        await markSent("ultrasonic", "Sonido enviado. El permiso está en todo el tono.");
        return;
      }
      if (channel === "ble" || channel === "optical") {
        setBusy(true);
        const detail = await transmitChannel(channel, encodeEnvelope(envelope));
        await markSent(channel, detail);
        return;
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "El canal falló");
    } finally {
      setBusy(false);
      setPlaying(false);
    }
  }

  return (
    <div className="space-y-4">
      {qrUrl ? (
        <div className="overflow-hidden rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="Permiso firmado" className="mx-auto w-full max-w-[22rem] aspect-square" />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
          Armando QR…
        </div>
      )}
      <ChannelRow active={active} busy={busy || playing} onPick={(id) => void send(id)} />
      {soundOpen ? <SoundPlayback playing={playing} onReplay={() => void replaySound()} /> : null}
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
