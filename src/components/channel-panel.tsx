"use client";

import { useEffect, useRef, useState } from "react";
import { ChannelRow, SoundPlayback } from "@/components/channel-row";
import { useWallet } from "@/components/wallet-provider";
import { playSound, shareViaSms, transmitChannel } from "@/lib/air-io";
import { encodeEnvelopeQr } from "@/lib/envelope-pack";
import { type Channel } from "@/lib/channels";
import { envelopeFilename, type SignedEnvelope } from "@/lib/payload";
import { fromBaseUnits } from "@/lib/format";
import { notifyPeer } from "@/lib/notify";
import { receiptFromPermit } from "@/lib/receipts";

type Props = {
  envelope: SignedEnvelope;
  qrUrl: string | null;
  onSent: (channel: Channel) => void;
  autoStart?: Exclude<Channel, "online"> | null;
};

export function ChannelPanel({ envelope, qrUrl, onSent, autoStart }: Props) {
  const { wallet } = useWallet();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Exclude<Channel, "online"> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const autoStarted = useRef(false);

  function compactPayload() {
    return encodeEnvelopeQr(envelope);
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
      await playSound(compactPayload());
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
        await markSent("qr", "Mostrale este QR al que cobra.");
        return;
      }
      if (channel === "copy") {
        await navigator.clipboard.writeText(compactPayload());
        await markSent("copy", "Permiso copiado. Si te queda más fácil, mandalo por SMS.");
        return;
      }
      if (channel === "sms") {
        await markSent("sms", shareViaSms(compactPayload()));
        return;
      }
      if (channel === "file") {
        const blob = new Blob([compactPayload()], { type: "text/plain" });
        const url = URL.createObjectURL(url);
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
        await new NDEF().write({ records: [{ recordType: "text", data: compactPayload() }] });
        await markSent("nfc", "Escrito en el tag NFC.");
        return;
      }
      if (channel === "ultrasonic") {
        setBusy(true);
        setSoundOpen(true);
        setPlaying(true);
        await playSound(compactPayload());
        await markSent("ultrasonic", "Sonido enviado. El permiso está en todo el tono.");
        return;
      }
      if (channel === "ble" || channel === "optical") {
        setBusy(true);
        const detail = await transmitChannel(channel, compactPayload());
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

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void send(autoStart);
  }, [autoStart]);

  return (
    <div className="space-y-4">
      {qrUrl ? (
        <div className="overflow-hidden rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="Permiso firmado" className="mx-auto w-full max-w-[28rem] aspect-square bg-white p-1" />
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
