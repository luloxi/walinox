/**
 * Public VAPID can ship in the client bundle.
 * Private key MUST come from VAPID_PRIVATE_KEY (Vercel / server env). Never commit it.
 */
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "BITqprPMRHXLOFZbHecSTW4TA6cDVPhXWYHvEotsGOU0dVx1byl7i2Izd4TFXx7lzAiq0vcVM0zJw7FQVKQuCf4";

export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@walinox.app";

export function vapidConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
