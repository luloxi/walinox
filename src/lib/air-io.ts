import {
  BLE_CHAR,
  BLE_SERVICE,
  bleAssemble,
  bleChunks,
  demodulateFsk,
  modulateFsk,
  opticalGrids,
  packAir,
  paintOpticalGrid,
  unpackAir,
} from "@/lib/air";
import type { Channel } from "@/lib/channels";

type BleChar = {
  writeValue: (data: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
  readValue: () => Promise<DataView>;
  startNotifications: () => Promise<unknown>;
  addEventListener: (type: string, listener: (ev: Event) => void) => void;
  value?: DataView | null;
};

type BleDevice = {
  gatt?: {
    connect: () => Promise<{
      getPrimaryService: (uuid: string) => Promise<{
        getCharacteristic: (uuid: string) => Promise<BleChar>;
      }>;
    }>;
    disconnect: () => void;
  };
};

function audioContext(): AudioContext {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) throw new Error("Este navegador no tiene Web Audio");
  return new Ctor();
}

export async function playSound(payload: string): Promise<void> {
  const ctx = audioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const pcm = modulateFsk(packAir(payload), ctx.sampleRate);
  const buffer = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
  buffer.getChannelData(0).set(pcm);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  await new Promise<void>((resolve, reject) => {
    src.onended = () => {
      void ctx.close();
      resolve();
    };
    src.addEventListener("error", () => reject(new Error("No se pudo reproducir el sonido")));
    src.start();
  });
}

export async function listenSound(opts?: { signal?: AbortSignal; timeoutMs?: number }): Promise<string> {
  const timeoutMs = opts?.timeoutMs ?? 25000;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
  });
  const ctx = audioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  src.connect(proc);
  proc.connect(mute);
  mute.connect(ctx.destination);

  const chunks: Float32Array[] = [];
  let total = 0;
  const max = ctx.sampleRate * 16;

  function stop(): void {
    proc.disconnect();
    src.disconnect();
    mute.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void ctx.close();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error, value?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      opts?.signal?.removeEventListener("abort", onAbort);
      stop();
      if (err) reject(err);
      else resolve(value ?? "");
    };

    const timer = window.setTimeout(() => {
      finish(new Error("No se oyó un permiso. Subí el volumen y acercá los celulares."));
    }, timeoutMs);

    const onAbort = () => finish(new Error("Escucha cancelada"));
    opts?.signal?.addEventListener("abort", onAbort, { once: true });

    proc.onaudioprocess = (event) => {
      if (settled) return;
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      chunks.push(copy);
      total += copy.length;
      while (total > max && chunks.length > 1) {
        total -= chunks[0].length;
        chunks.shift();
      }
      const pcm = new Float32Array(total);
      let o = 0;
      for (const chunk of chunks) {
        pcm.set(chunk, o);
        o += chunk.length;
      }
      const packet = demodulateFsk(pcm, ctx.sampleRate);
      if (!packet) return;
      try {
        finish(undefined, unpackAir(packet));
      } catch (err) {
        finish(err instanceof Error ? err : new Error("Sonido ilegible"));
      }
    };
  });
}

export async function playOptical(payload: string): Promise<void> {
  const grids = opticalGrids(packAir(payload));
  const root = document.createElement("div");
  root.style.cssText =
    "position:fixed;inset:0;z-index:80;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;";
  const hint = document.createElement("p");
  hint.textContent = "Apuntá la cámara del otro celular (Depositar → Escanear).";
  hint.style.cssText = "color:#eee;font:14px system-ui;margin:0 0 12px;text-align:center;";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:min(92vw,92vh);height:min(92vw,92vh);max-width:520px;max-height:520px;";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Listo";
  btn.style.cssText =
    "margin-top:12px;height:44px;min-width:160px;border:0;border-radius:10px;background:#1f7a86;color:#f4fdff;font:600 14px system-ui;cursor:pointer;";
  root.append(hint, canvas, btn);
  document.body.appendChild(root);

  const size = Math.min(window.innerWidth, window.innerHeight, 520);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    root.remove();
    throw new Error("No hay canvas");
  }

  const wake =
    "wakeLock" in navigator ? await navigator.wakeLock.request("screen").catch(() => null) : null;

  let n = 0;
  await new Promise<void>((resolve) => {
    const tick = () => {
      paintOpticalGrid(ctx, grids[n % grids.length], n % 2 === 0);
      n += 1;
    };
    tick();
    const id = window.setInterval(tick, 160);
    let timeout = 0;
    const done = () => {
      window.clearInterval(id);
      window.clearTimeout(timeout);
      resolve();
    };
    btn.addEventListener("click", done, { once: true });
    timeout = window.setTimeout(done, Math.max(2400, grids.length * 160 * 3));
  });

  await wake?.release().catch(() => undefined);
  root.remove();
}

function bluetoothApi(): { requestDevice: (opts: object) => Promise<BleDevice> } {
  const bluetooth = (navigator as Navigator & { bluetooth?: { requestDevice: (opts: object) => Promise<BleDevice> } })
    .bluetooth;
  if (!bluetooth) throw new Error("Web Bluetooth no está en este navegador");
  return bluetooth;
}

function chunkBuffer(chunk: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(chunk.length);
  copy.set(chunk);
  return copy.buffer;
}

function viewBytes(view: DataView): Uint8Array {
  const out = new Uint8Array(view.byteLength);
  for (let i = 0; i < view.byteLength; i++) out[i] = view.getUint8(i);
  return out;
}

async function writeGatt(payload: string): Promise<void> {
  const bluetooth = bluetoothApi();
  const device = (await bluetooth.requestDevice({
    filters: [{ services: [BLE_SERVICE] }],
    optionalServices: [BLE_SERVICE],
  })) as BleDevice;
  const server = await device.gatt?.connect();
  if (!server) throw new Error("No se pudo conectar por Bluetooth");
  try {
    const service = await server.getPrimaryService(BLE_SERVICE);
    const char = await service.getCharacteristic(BLE_CHAR);
    for (const chunk of bleChunks(packAir(payload))) {
      const data = chunkBuffer(chunk);
      if (typeof char.writeValueWithoutResponse === "function") {
        await char.writeValueWithoutResponse(data);
      } else {
        await char.writeValue(data);
      }
    }
  } finally {
    device.gatt?.disconnect();
  }
}

async function shareFile(payload: string): Promise<boolean> {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  const file = new File([payload], "walinox.json", { type: "application/json" });
  if (!navigator.canShare({ files: [file] })) return false;
  await navigator.share({
    files: [file],
    title: "Permiso Walinox",
    text: "Sobre firmado de Walinox",
  });
  return true;
}

export async function sendBluetooth(payload: string): Promise<string> {
  try {
    if (await shareFile(payload)) {
      return "Elegí Bluetooth, Nearby o AirDrop en la hoja de compartir.";
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("Compartir cancelado");
  }
  try {
    await writeGatt(payload);
    return "Permiso escrito por Bluetooth.";
  } catch (err) {
    if (err instanceof Error && (err.name === "NotFoundError" || err.name === "AbortError")) {
      throw new Error(
        "Chrome no puede anunciarse como periférico GATT. En Android: Compartir → Bluetooth / Nearby. Si no, usá sonido o luz.",
      );
    }
    throw err instanceof Error ? err : new Error("Bluetooth falló");
  }
}

export async function readBluetooth(): Promise<string> {
  const bluetooth = bluetoothApi();
  const device = (await bluetooth.requestDevice({
    filters: [{ services: [BLE_SERVICE] }],
    optionalServices: [BLE_SERVICE],
  })) as BleDevice;
  const server = await device.gatt?.connect();
  if (!server) throw new Error("No se pudo conectar por Bluetooth");
  try {
    const service = await server.getPrimaryService(BLE_SERVICE);
    const char = await service.getCharacteristic(BLE_CHAR);
    const chunks: Uint8Array[] = [];
    try {
      const read = viewBytes(await char.readValue());
      if (read.length >= 2) chunks.push(read);
    } catch {
      /* notifications below */
    }
    await char.startNotifications();
    const notified = await new Promise<Uint8Array[]>((resolve) => {
      const got: Uint8Array[] = [...chunks];
      const timer = window.setTimeout(() => resolve(got), 5000);
      char.addEventListener("characteristicvaluechanged", (event) => {
        const view = (event.target as unknown as BleChar).value;
        if (!view) return;
        got.push(viewBytes(view));
        const total = got[0]?.[1] ?? 0;
        if (total && got.length >= total) {
          window.clearTimeout(timer);
          resolve(got);
        }
      });
    });
    const all = notified.length ? notified : chunks;
    if (all.length === 0) throw new Error("El otro dispositivo no mandó datos");
    return unpackAir(bleAssemble(all));
  } finally {
    device.gatt?.disconnect();
  }
}

export async function transmitChannel(channel: Channel, payload: string): Promise<string> {
  if (channel === "ultrasonic") {
    await playSound(payload);
    return "Permiso enviado por sonido. En el otro celular: Depositar → Escuchar.";
  }
  if (channel === "optical") {
    await playOptical(payload);
    return "Pantalla transmitió el permiso. En el otro: Depositar → Escanear.";
  }
  if (channel === "ble") {
    return sendBluetooth(payload);
  }
  throw new Error("Canal no implementado acá");
}
