# Roadmap — outside the current MVP

**MVP (August 2026):** payments that do not need the **buyer’s** internet, for **B2B and B2C**.

Core loop: build a charge (amount or products) → the buyer signs **offline** → the signature travels over **QR / NFC / Bluetooth / sound / light / file / copy** → the merchant settles on-chain when they have a network.

Settlement is always [USDT on Ethereum](https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7) via [Uniswap Permit2](https://developers.uniswap.org/docs/protocols/permit2/overview).

---

## In the MVP

- Local [WDK](https://docs.wdk.tether.io) wallet or an injected wallet.
- **Wallet:** send online/offline, receive, request, pay (scan charge / signature).
- **Shop (B2C seller):** list products, POS, collect on **every offline channel**.
- Minimal contacts.
- Local activity (no automated reports).
- Settings: display currency, wallet, push, theme, optional cloud backup of **app data** (never the seed).
- **Add funds:** fiat → USDT via [MoonPay](https://www.moonpay.com) (ARS as `baseCurrencyCode` when `NEXT_PUBLIC_MOONPAY_API_KEY` is set). That **buys USDT**. It is not “pay a shop in on-chain pesos.”

## Pulled from the MVP (still on the roadmap)

### Public storefront / buyer marketplace

- **What it was:** buyer marketplace, public `/tienda/[id]` link, shareable vitrine, browsing other shops, vouchers as a separate product and redemption.
- **Why it is out:** that is a web storefront, not “charge at the counter while the buyer is offline.”
- **What stayed:** **Shop** — the seller’s own catalog + POS + offline channels (including the live [lulox.eth](https://app.ens.domains/lulox.eth) demo catalog).
- **Status:** out of the main nav. Code may still exist in the repo.

### Automated monthly report

- **What it was:** monthly summary via push/inbox, prompt on Activity, toggle in Settings.
- **Why it is out:** it does not help offline payment.
- **Status:** out of Settings, no prompt. Manual **Activity** remains.

## ARS ↔ USDT loop (daily-driver inclusion)

Closing pesos ↔ USDT is what would make Walinox a daily app in Argentina, not only a crypto wallet.

### Today

- UI shows balances and amounts in **ARS (reference)** using a market USDT quote.
- **On-ramp:** **Add funds** → MoonPay (fiat → USDT to the address), ARS as the default fiat.
- **On-chain settlement:** always **USDT**. There is no native Argentine-peso token in the offline payment path.

### Later — deeper ARS on-ramp

- MoonPay (or whichever [WDK](https://docs.wdk.tether.io) fiat rail is current) with **ARS + local rails** (card, bank transfer) proven in production.
- Copy that stays honest: “you buy USDT with pesos”; the spend is still USDT.
- Fallback if MoonPay drops ARS: another documented fiat rail — no homegrown custodial on-ramp.

### Later — USDT → ARS off-ramp

- Cash-out to a bank account / CVU / ARS wallet (MoonPay sell, or a local exchange / PSP / regulated fintech).
- UX in Settings or Wallet: “Cash out to pesos” with amount, destination, and status.
- Compliance belongs to the provider (KYC, limits, settlement times). Walinox does not custody fiat.

### Later — “pay as if it were pesos” without lying to the ledger

- Keep charging and settling in **USDT**.
- UX: both sides type **ARS**; the app converts with the live rate.
- Optional bilingual receipt: “you paid X ARS ≈ Y USDT.”
- **Not** a homemade ARS stablecoin in the MVP. If a liquid on-chain ARS ever exists, evaluate it as a unit of account — not as a replacement for the offline-USDT core.

### Why this is not a mega-app yet

On-ramp + off-ramp + offline charge only close inclusion if the fiat rail is reliable, cheap, and legal in AR. That is product + partner + compliance, not a UI sprint. Post-hackathon order: (1) a usable ARS on-ramp, (2) a minimal off-ramp, (3) ARS conversion everywhere in the POS.

## Later ideas

- Bring back the public vitrine / vouchers / redemption.
- Monthly reports and analytics.
- Stronger P2P via [Pears](https://docs.pears.com) / Hyperswarm.
- Seed recovery beyond the local PIN.
