import { getAddress, isAddress } from "ethers";
import { shortAddress } from "@/lib/format";

export type NotifyKind = "usdt" | "vale" | "redeemed" | "ping" | "permit" | "incoming";

export type InboxItem = {
  id: string;
  kind: NotifyKind;
  title: string;
  body: string;
  url: string;
  from: string;
  to: string;
  amount?: string;
  token?: string;
  at: string;
  read: boolean;
};

export type NotifyInput = {
  kind: NotifyKind;
  from: string;
  to: string;
  amount?: string;
  token?: string;
  message?: string;
  url?: string;
};

export type InboxStore = {
  load: () => InboxItem[];
  save: (items: InboxItem[]) => void;
};

export const INBOX_EVENT = "walinox-inbox";
export const INBOX_STORAGE_KEY = "walinox.inbox";
export const BANNER_KEY = "walinox.notifyBanner";
export const NOTIFY_OFF_KEY = "walinox.notify.off";
const MAX_INBOX = 80;

export function memoryInboxStore(seed: InboxItem[] = []): InboxStore {
  let items = [...seed];
  return {
    load: () => items,
    save: (next) => {
      items = [...next];
    },
  };
}

export function localStorageInboxStore(key = INBOX_STORAGE_KEY): InboxStore {
  return {
    load() {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as InboxItem[]) : [];
      } catch {
        return [];
      }
    },
    save(items) {
      localStorage.setItem(key, JSON.stringify(items));
    },
  };
}

let store: InboxStore = memoryInboxStore();

export function setInboxStore(next: InboxStore): void {
  store = next;
}

function currentStore(): InboxStore {
  if (typeof window !== "undefined") return localStorageInboxStore();
  return store;
}

export function notifyKindUrl(kind: NotifyKind, from?: string): string {
  if (kind === "vale") return "/vales";
  if (kind === "redeemed") return "/tienda";
  if (kind === "permit") return "/?tab=recibir";
  if (kind === "ping" && from) return `/contacts/${from}`;
  return "/";
}

export function buildNotify(
  input: NotifyInput,
): Omit<InboxItem, "id" | "at" | "read"> {
  const fromLabel = isAddress(input.from) ? shortAddress(input.from) : input.from || "Alguien";
  const amount = input.amount?.trim();
  const token = input.token?.trim() || "USDT";
  const note = input.message?.trim().slice(0, 200);

  const copy: Record<NotifyKind, { title: string; body: string; url: string }> = {
    usdt: {
      title: "Te mandaron USDT",
      body: amount ? `${fromLabel} te envió ${amount} ${token}` : `${fromLabel} te envió ${token}`,
      url: "/",
    },
    vale: {
      title: "Te dieron un vale",
      body: amount
        ? `${fromLabel} te dejó un vale de ${amount} ${token}`
        : `${fromLabel} te dejó un vale`,
      url: "/vales",
    },
    redeemed: {
      title: "Canjearon un vale",
      body: `${fromLabel} canjeó el vale`,
      url: "/tienda",
    },
    ping: {
      title: "Walinox",
      body: note || `${fromLabel} te avisó`,
      url: input.from ? `/contacts/${input.from}` : "/",
    },
    permit: {
      title: "Permiso USDT",
      body: `${fromLabel} te firmó un permiso`,
      url: "/?tab=recibir",
    },
    incoming: {
      title: "Entró USDT",
      body: amount ? `Tu saldo subió a ${amount} USDT` : "Entró USDT a tu billetera",
      url: "/",
    },
  };

  const preset = copy[input.kind];
  return {
    kind: input.kind,
    title: preset.title,
    body: preset.body,
    url: input.url ?? preset.url,
    from: input.from,
    to: input.to,
    amount: amount || undefined,
    token: amount ? token : undefined,
  };
}

export function senderCopy(input: NotifyInput): { title: string; body: string } {
  const toLabel = isAddress(input.to) ? shortAddress(input.to) : input.to;
  const amount = input.amount?.trim();
  const token = input.token?.trim() || "USDT";
  if (input.kind === "vale") {
    return { title: "Vale emitido", body: `Se lo mandaste a ${toLabel}` };
  }
  if (input.kind === "redeemed") {
    return { title: "Vale canjeado", body: `Confirmaste el canje de ${toLabel}` };
  }
  if (input.kind === "ping") {
    return { title: "Aviso enviado", body: `Le avisaste a ${toLabel}` };
  }
  if (input.kind === "permit") {
    return { title: "Permiso enviado", body: `Se lo firmaste a ${toLabel}` };
  }
  return {
    title: "Enviaste USDT",
    body: amount ? `Mandaste ${amount} ${token} a ${toLabel}` : `Mandaste ${token} a ${toLabel}`,
  };
}

export function sameAddress(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function emitInbox(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INBOX_EVENT));
}

export function listInbox(): InboxItem[] {
  return currentStore()
    .load()
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function unreadCount(items: InboxItem[] = listInbox()): number {
  return items.filter((item) => !item.read).length;
}

export function addInboxItem(
  input: Omit<InboxItem, "id" | "at" | "read"> & Partial<Pick<InboxItem, "id" | "at" | "read">>,
): InboxItem {
  const item: InboxItem = {
    ...input,
    id: input.id ?? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    at: input.at ?? new Date().toISOString(),
    read: input.read ?? false,
  };
  const current = currentStore();
  const existing = current.load();
  if (existing.some((row) => row.id === item.id)) return item;
  current.save([item, ...existing].slice(0, MAX_INBOX));
  emitInbox();
  return item;
}

export function mergeInbox(items: InboxItem[]): number {
  if (items.length === 0) return 0;
  const current = currentStore();
  const existing = current.load();
  const seen = new Set(existing.map((item) => item.id));
  const fresh = items.filter((item) => !seen.has(item.id));
  if (fresh.length === 0) return 0;
  current.save([...fresh, ...existing].slice(0, MAX_INBOX));
  emitInbox();
  return fresh.length;
}

export function markInboxRead(id?: string): void {
  const current = currentStore();
  const next = current.load().map((item) => {
    if (id && item.id !== id) return item;
    return { ...item, read: true };
  });
  current.save(next);
  emitInbox();
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function showLocalNotification(
  title: string,
  options: { body: string; url?: string; tag?: string },
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const payload = {
    type: "SHOW_NOTIFICATION",
    title,
    body: options.body,
    url: options.url ?? "/",
    tag: options.tag ?? "walinox-local",
  };
  try {
    const ready = await navigator.serviceWorker?.ready;
    if (ready?.active) {
      ready.active.postMessage(payload);
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, { body: options.body, icon: "/icons/icon-192.png", tag: payload.tag });
  } catch {
    /* unsupported */
  }
}

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function subscribePush(address: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!isAddress(address)) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  try {
    const vapid = await fetch("/api/push/vapid").then(
      (res) => res.json() as Promise<{ publicKey?: string }>,
    );
    if (!vapid.publicKey) return false;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as BufferSource,
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: getAddress(address),
        subscription: subscription.toJSON(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribePush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch {
    /* ignore */
  }
}

export async function pullRemoteInbox(address: string): Promise<number> {
  if (!isAddress(address)) return 0;
  try {
    const res = await fetch(`/api/push/inbox?address=${encodeURIComponent(address)}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { items?: InboxItem[] };
    const items = Array.isArray(data.items) ? data.items : [];
    return mergeInbox(
      items.map((item) => ({
        ...item,
        read: false,
      })),
    );
  } catch {
    return 0;
  }
}

export async function notifyPeer(input: NotifyInput): Promise<{ ok: boolean }> {
  if (!isAddress(input.to) || !isAddress(input.from)) return { ok: false };
  if (sameAddress(input.from, input.to)) return { ok: false };

  const payload = {
    ...buildNotify(input),
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    at: new Date().toISOString(),
  };

  if (typeof document !== "undefined" && !document.hasFocus()) {
    const mine = senderCopy(input);
    await showLocalNotification(mine.title, {
      body: mine.body,
      url: payload.url,
      tag: `sent-${payload.id}`,
    });
  }

  try {
    const res = await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        message: input.message?.trim().slice(0, 200),
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
