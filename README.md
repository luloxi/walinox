# Walinox

**Pay in USDT when the buyer has no signal.**

The payer signs on their phone offline. The merchant settles on Ethereum when they are back online. Funds stay in self-custodial [USDT](https://tether.io) on Ethereum mainnet — keys never leave the device.

[Live demo](https://walinox-nu.vercel.app) · [Wallet](docs/wallet.md) · [Env](docs/env.md) · [Cloud backup](database.md) · [Roadmap](docs/roadmap.md)

---

## What it is

A Spanish-language [PWA](https://web.dev/learn/pwa/) for self-custodial USDT on [Ethereum](https://ethereum.org). Payments do not wait on the buyer’s data connection: they authorize a spend with an [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signature, hand it over in person (QR, NFC, Bluetooth, sound, light, file, or copy), and the merchant broadcasts it later.

Settlement is always [Tether USD (USDT)](https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7) on Ethereum mainnet. There is no ARS token on-chain. Local currency in the UI is a live FX reference.

The [lulox.eth](https://app.ens.domains/lulox.eth) shop is the live demo catalog (1–2 USDT items).

## How a payment moves

```
Buyer (maybe airplane mode)          Merchant (needs the network)
─────────────────────────────        ────────────────────────────
1. Sign Permit2 EIP-712
2. Hand over the envelope  ────────► 3. permitTransferFrom()
                                        USDT moves on-chain
```

Signing is **not** a transfer. Mainnet USDT is a classic [ERC-20](https://eips.ethereum.org/EIPS/eip-20). It does **not** implement [ERC-2612 `permit()`](https://eips.ethereum.org/EIPS/eip-2612), so Walinox uses [Uniswap Permit2](https://developers.uniswap.org/docs/protocols/permit2/overview) instead:

1. Once per wallet: `approve` [Permit2](https://etherscan.io/address/0x000000000022D473030F116dDEE9F6B43aC78BA3) (`0x000000000022D473030F116dDEE9F6B43aC78BA3`).
2. Each offline spend: sign `PermitTransferFrom` ([signature transfer](https://developers.uniswap.org/docs/protocols/permit2/concepts/signature-transfer)).
3. The merchant (or any online party) calls [`permitTransferFrom`](https://github.com/Uniswap/permit2) — that is when USDT actually moves.

Online sends can skip the envelope and call ERC-20 `transfer` directly.

| Channel | Role |
| --- | --- |
| QR | Default in-person path |
| Copy / file | Always available |
| NFC / sound / light / Bluetooth | Same signed envelope, different air |

After the first PWA load, a buyer can pay in airplane mode.

## Tether stack

Walinox is built on Tether’s current client-side kits — not a custodial Tether account.

| Piece | What Walinox uses | Docs |
| --- | --- | --- |
| **USDT** | Ethereum mainnet ERC-20 settlement | [tether.io](https://tether.io) · [token](https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7) |
| **[WDK](https://docs.wdk.tether.io)** | Local non-custodial wallet (`@tetherto/wdk`, `@tetherto/wdk-wallet-evm`) | [About WDK](https://docs.wdk.tether.io/overview/about/) · [Get started](https://docs.wdk.tether.io/sdk/get-started/) |
| **EIP-7702 gasless** | Pay gas in USDT via `@tetherto/wdk-wallet-evm-7702-gasless` (Candide bundler). If that fails, the EOA needs ETH. | [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) · [WDK module](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-evm-7702-gasless/) · [package](https://github.com/tetherto/wdk-wallet-evm-7702-gasless) |
| **[QVAC](https://docs.qvac.tether.io)** | “In one sentence” form fill (send, contacts, products). Qwen3 0.6B Instruct Q4 via `/api/agent`. Heuristic fallback if QVAC is down. | [qvac.tether.io](https://qvac.tether.io) |
| **MoonPay** | Fiat → USDT on-ramp (Tether WDK’s documented fiat rail) | [MoonPay](https://www.moonpay.com) |

The seed stays on the device (PIN-encrypted). Tether does not custody keys. Walinox never stores the seed on the server.

## Ethereum primitives

| Primitive | Why it is here |
| --- | --- |
| [ERC-20](https://eips.ethereum.org/EIPS/eip-20) | USDT transfers |
| [EIP-712](https://eips.ethereum.org/EIPS/eip-712) | Typed signatures for Permit2, terms of use, and vales |
| [ERC-2612](https://eips.ethereum.org/EIPS/eip-2612) | **Not** used — mainnet USDT has no `permit()` |
| [Uniswap Permit2](https://developers.uniswap.org/docs/protocols/permit2/overview) | Signed spends that work for any ERC-20 |
| [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) / [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) | Optional gasless path (paymaster takes USDT) |
| [ENS](https://docs.ens.domains/) | Names like `lulox.eth` as pay-to addresses |

Injected wallets (MetaMask, Rabby, Rainbow, …) connect through [RainbowKit](https://rainbowkit.com) + [wagmi](https://wagmi.sh) on Ethereum mainnet.

## What ships in the MVP

- **P2P / B2B** — send, receive, request, pay (scan a signed envelope).
- **B2C / Shop** — seller catalog, POS checkout, collect over every offline channel.
- **Wallet** — on-chain USDT balance, on-ramp, receive, send, pay.
- **Contacts, inbox, activity, settings** — PIN / biometrics, theme, seed backup (local wallet).

Deferred (public storefront URL, vouchers as a marketplace, monthly reports, USDT → ARS off-ramp): [roadmap](docs/roadmap.md).

## Run it

Node 22.17+.

```bash
npm install
npm test
npm run build
npm start
```

Environment variables: [docs/env.md](docs/env.md). How users get a wallet: [docs/wallet.md](docs/wallet.md). Multi-device app data (never the seed): [database.md](database.md).

## Honest limits

- Local seed is PIN-encrypted on the device. There is no cloud recovery of the 12 words.
- Durable web push on Vercel needs a durable store in production.
- The public Candide bundler is rate-limited; gasless can fall back to an ETH-paying EOA.
- MoonPay on-ramp needs `NEXT_PUBLIC_MOONPAY_API_KEY`. ARS off-ramp is still roadmap.
