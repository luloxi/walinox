# Environment variables

## Push (VAPID)

The **public** key has a default in `src/lib/vapid.ts`.
The **private** key lives only on the server — never in the repo.

In Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>
VAPID_PRIVATE_KEY=<private>
VAPID_SUBJECT=mailto:hello@walinox.app
```

Generate a new pair:

```bash
npx web-push generate-vapid-keys
```

Without `VAPID_PRIVATE_KEY`, push is disabled (fail closed).

## On-ramp ([MoonPay](https://www.moonpay.com) · Tether WDK fiat rail)

Tether documents `@tetherto/wdk-protocol-fiat-moonpay` as the WDK fiat on-ramp. See [WDK](https://docs.wdk.tether.io).

```
NEXT_PUBLIC_MOONPAY_API_KEY=pk_live_…   # pk_test_… only hits MoonPay sandbox
MOONPAY_SECRET_KEY=sk_live_…            # optional; signs the URL and locks walletAddress
```

Without the publishable key, **Add funds** tells the user it is not configured.
With the secret on the server, `/api/onramp/sign` signs the widget so the destination address is prefilled.

Sandbox keys do **not** mint mainnet USDT. Production demo needs live MoonPay keys.

## Postgres ([Neon](https://neon.tech))

In Neon: **Connect** → `.env` tab → **Copy snippet**. That is `DATABASE_URL` (pooling on). Paste it into `.env.local`.

Optional: turn pooling off and copy again as `DATABASE_URL_UNPOOLED` (local migrations).

The same vars are already on Vercel (sensitive). Without `.env.local` the PWA still runs on `localStorage`. Details: [database.md](../database.md).

## RPC

```
NEXT_PUBLIC_RPC_URL=https://ethereum-rpc.publicnode.com
```

Used for mainnet USDT `balanceOf` and WDK provider. Defaults to a public Ethereum mainnet endpoint if unset.
