# Database

Postgres ([Neon](https://neon.tech) on [Vercel](https://vercel.com)) + [Prisma](https://www.prisma.io). The app is **offline-first**: products, contacts, prefs, and activity live in **`localStorage`**. The wallet **seed never** goes to the database.

USDT balances are read from Ethereum (`balanceOf` on the [USDT](https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7) contract). They are not mirrored in Postgres.

## Automatic cloud copy

With a wallet ready and a network, the app **saves on its own** (debounce ~8 s after edits, and about every ~3 min). **Shop** shows a chip with the age of the last copy; tap it to force a save. Settings can **Save now** or **Restore** (with confirmation).

This is app-data backup, not key backup — no wallet signature is required. The API is rate-limited. Only products whose `issuer` is the owning address are accepted.

| In the DB | Never in the DB |
| --- | --- |
| Own products, contacts, prefs, theme, receipts, inbox, local vales | Seed / keys |
| | USDT balance (on-chain) |

## Stack

- Prisma + Postgres (`DATABASE_URL` / `POSTGRES_PRISMA_URL`)
- Model: `CloudBackup(address, payload Json)`
- Auth: no signature in the MVP; mitigation = rate limit + issuer check

Locally, without those env vars, the app still runs and the endpoint returns 503.

```bash
npx prisma migrate deploy
npm run dev
```

Vercel build: `prisma generate` + `prisma migrate deploy`. Env details: [docs/env.md](docs/env.md).
