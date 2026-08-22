import webpush from "web-push";
import { isAddress } from "ethers";
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/lib/vapid";
import {
  addSubscription,
  listSubscriptions,
  queueMessage,
  removeSubscription,
  takeInbox,
  type ServerMessage,
  type StoredSub,
} from "@/lib/push-store";

let vapidReady = false;

function ensureVapid(): void {
  if (vapidReady) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidReady = true;
}

export function publicVapidKey(): string {
  return VAPID_PUBLIC_KEY;
}

export function saveSubscription(address: string, sub: StoredSub): void {
  addSubscription(address, sub);
}

export async function dispatchNotify(
  message: ServerMessage,
): Promise<{ delivered: number; queued: boolean }> {
  if (!isAddress(message.to)) throw new Error("Address inválida");
  queueMessage(message);
  ensureVapid();
  const subs = listSubscriptions(message.to);
  let delivered = 0;
  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url: message.url,
    tag: message.id,
  });
  for (const sub of subs) {
    if (!sub.keys?.p256dh || !sub.keys?.auth) continue;
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        payload,
      );
      delivered += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        removeSubscription(message.to, sub.endpoint);
      }
    }
  }
  return { delivered, queued: true };
}

export function drainInbox(address: string): ServerMessage[] {
  return takeInbox(address);
}
