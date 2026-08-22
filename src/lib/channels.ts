export const CHANNELS = [
  "online",
  "qr",
  "ble",
  "nfc",
  "ultrasonic",
  "optical",
  "copy",
  "file",
] as const;

export type Channel = (typeof CHANNELS)[number];

export type ChannelStatus = {
  id: Channel;
  label: string;
  description: string;
  available: boolean;
  reason?: string;
};

const LABELS: Record<Channel, { label: string; description: string }> = {
  online: { label: "On-chain", description: "Normal ERC-20 transfer with gas." },
  qr: { label: "QR code", description: "Show or scan a QR. Primary offline path." },
  ble: { label: "Bluetooth", description: "Web Bluetooth GATT write, Chrome/Android only." },
  nfc: { label: "NFC", description: "Web NFC NDEF write, Android Chrome only." },
  ultrasonic: { label: "Sound", description: "Short audio burst of the payload." },
  optical: { label: "Light", description: "Flash the screen as a binary pattern." },
  copy: { label: "Copy", description: "Copy the signed JSON to the clipboard." },
  file: { label: "File", description: "Download or import a .json permit file." },
};

export function channelStatus(id: Channel): ChannelStatus {
  const meta = LABELS[id];
  if (typeof navigator === "undefined") {
    const available = id === "qr" || id === "copy" || id === "file";
    return {
      id,
      ...meta,
      available,
      reason: available ? undefined : "Needs a browser",
    };
  }

  switch (id) {
    case "ble":
      return {
        id,
        ...meta,
        available: "bluetooth" in navigator,
        reason: "bluetooth" in navigator ? undefined : "Web Bluetooth is not in this browser",
      };
    case "nfc":
      return {
        id,
        ...meta,
        available: "NDEFReader" in window,
        reason: "NDEFReader" in window ? undefined : "Web NFC is not in this browser",
      };
    case "ultrasonic":
      return {
        id,
        ...meta,
        available: typeof AudioContext !== "undefined" || typeof window.webkitAudioContext !== "undefined",
        reason: undefined,
      };
    default:
      return { id, ...meta, available: true };
  }
}

export function allChannelStatuses(): ChannelStatus[] {
  return CHANNELS.map(channelStatus);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
