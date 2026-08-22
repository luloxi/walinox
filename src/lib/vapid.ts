/** Demo VAPID pair (same idea as the WalletConnect demo project id). Override in env for production. */
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "BMXlag0cxe8J1lWmTYPg_gIF8MqHFcO5HCksWHy9Ogqp1Mdko_ajZ6TLYWuEkqzThx2bM3Sku_LkOhch7_wJ4QE";

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ?? "Aj5oHjx-5zpdhcL9WQ8KPyTLPgTmb-0z4RNpmXldRkw";

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@walinox.app";
