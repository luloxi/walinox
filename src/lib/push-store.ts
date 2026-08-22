import fs from "node:fs";
import path from "node:path";
import { getAddress, isAddress } from "ethers";

export type StoredSub = {
  endpoint: string;
  keys?: { p256dh: string; auth: string };
};

export type ServerMessage = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  from: string;
  to: string;
  amount?: string;
  token?: string;
  at: string;
};

export type PushState = {
  subs: Record<string, StoredSub[]>;
  inbox: Record<string, ServerMessage[]>;
};

const MAX_INBOX = 50;
const g = globalThis as unknown as { __walinoxPush?: PushState };
let persistEnabled = true;

function emptyState(): PushState {
  return { subs: {}, inbox: {} };
}

const DATA_FILE = path.join(process.cwd(), ".data", "push-store.json");
const TMP_FILE = "/tmp/walinox-push.json";

function readStateFile(file: string): PushState | null {
  try {
    const raw = fs.readFileSync(/* turbopackIgnore: true */ file, "utf8");
    const parsed = JSON.parse(raw) as PushState;
    if (parsed && typeof parsed === "object" && parsed.subs && parsed.inbox) return parsed;
  } catch {
    /* missing or invalid */
  }
  return null;
}

function loadFile(): PushState | null {
  return readStateFile(DATA_FILE) ?? readStateFile(TMP_FILE);
}

function writeStateFile(file: string, snapshot: string): boolean {
  try {
    fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(file), { recursive: true });
    fs.writeFileSync(/* turbopackIgnore: true */ file, snapshot);
    return true;
  } catch {
    return false;
  }
}

function persist(): void {
  if (!persistEnabled) return;
  const snapshot = JSON.stringify(state());
  if (writeStateFile(DATA_FILE, snapshot)) return;
  writeStateFile(TMP_FILE, snapshot);
}

export function state(): PushState {
  if (!g.__walinoxPush) {
    g.__walinoxPush = loadFile() ?? emptyState();
  }
  return g.__walinoxPush;
}

export function resetPushStore(next: PushState = emptyState()): void {
  g.__walinoxPush = next;
}

export function disablePushPersist(): void {
  persistEnabled = false;
}

export function enablePushPersist(): void {
  persistEnabled = true;
}

export function normalizeKey(address: string): string {
  if (!isAddress(address)) throw new Error("Address inválida");
  return getAddress(address).toLowerCase();
}

export function addSubscription(address: string, sub: StoredSub): void {
  if (!sub.endpoint) throw new Error("subscription endpoint required");
  const key = normalizeKey(address);
  const current = state();
  const list = current.subs[key] ?? [];
  current.subs[key] = [sub, ...list.filter((item) => item.endpoint !== sub.endpoint)];
  persist();
}

export function removeSubscription(address: string, endpoint: string): void {
  const key = normalizeKey(address);
  const current = state();
  current.subs[key] = (current.subs[key] ?? []).filter((item) => item.endpoint !== endpoint);
  persist();
}

export function listSubscriptions(address: string): StoredSub[] {
  return [...(state().subs[normalizeKey(address)] ?? [])];
}

export function queueMessage(message: ServerMessage): ServerMessage {
  const key = normalizeKey(message.to);
  const current = state();
  const list = current.inbox[key] ?? [];
  if (list.some((item) => item.id === message.id)) return message;
  current.inbox[key] = [message, ...list].slice(0, MAX_INBOX);
  persist();
  return message;
}

export function takeInbox(address: string): ServerMessage[] {
  const key = normalizeKey(address);
  const current = state();
  const items = current.inbox[key] ?? [];
  current.inbox[key] = [];
  persist();
  return items;
}
