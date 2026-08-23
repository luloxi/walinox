# How a user enters Walinox

Walinox is **self-custodial**: the app does not hold funds or sign on a server. Sending, charging, or paying needs an Ethereum wallet that can sign.

There are **two** ways to get that wallet. Both are a real on-chain account with [USDT](https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7) on Ethereum mainnet.

---

## 1. Connect a wallet you already have

**Log in** / **External wallet**.

[RainbowKit](https://rainbowkit.com) opens: MetaMask, Rabby, Rainbow, Trust, Ledger, or whatever the browser already injected.

- Keys **never** enter Walinox. They sign in the user’s existing wallet.
- WalletConnect (QR to a phone) needs a real [Reown](https://reown.com) project id; the sample id does not work on localhost.

After connect: one [EIP-712](https://eips.ethereum.org/EIPS/eip-712) terms signature per address.

---

## 2. Local wallet ([Tether WDK](https://docs.wdk.tether.io))

**Local wallet**.

Creates or reopens a wallet in this browser with Tether’s [Wallet Development Kit](https://docs.wdk.tether.io/overview/about/).

In code (`src/lib/wallet.ts` / `seed-crypto.ts`):

1. `WDK.getRandomSeedPhrase(12)` if there is no vault yet.
2. Seed encrypted with the PIN (AES-GCM) in `walinox.seed.v2`.
3. `new WDK(seed).registerWallet("ethereum", WalletManagerEvm, { provider })` — see [WDK get started](https://docs.wdk.tether.io/sdk/get-started/).
4. First Ethereum account = the user address.
5. Optional: [`@tetherto/wdk-wallet-evm-7702-gasless`](https://github.com/tetherto/wdk-wallet-evm-7702-gasless) so gas can be paid in USDT ([EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)). If the bundler fails, the EOA needs ETH.

On **create**, the UI shows the 12-word phrase and asks the user to confirm a backup. **Settings → Security** can show it again with the PIN. After ~5 minutes idle, PIN or biometrics are required again.

### What that means for the user

| | Browser extension | Local WDK wallet |
| --- | --- | --- |
| Keys | In MetaMask / Rabby / … | In this browser (encrypted vault) |
| Install | Yes | No |
| Backup | That wallet’s backup | Write down the 12 words |
| Signing | Extension popup | In the page |
| Online gas | Whatever that wallet uses | Tries USDT via [WDK 7702 gasless](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-evm-7702-gasless/) |

WDK runs in the client. Tether does not custody the seed.

---

## Entry flow

```
Landing
   │
   ▼
Already have a wallet?
   no ──► WDK creates/unlocks local seed + PIN     yes ──► RainbowKit
        │                                                │
        └────────────────────┬───────────────────────────┘
                             ▼
                    Terms signature (EIP-712, once)
                             ▼
                        App (Wallet)
```

## After login

- **Wallet:** on-ramp, receive, send, pay.
- **Shop:** POS charge and the seller’s own catalog (demo shop: [lulox.eth](https://app.ens.domains/lulox.eth)).
- **Contacts, inbox, activity, settings.**

Without a wallet there is no balance, send, POS, activity, or settings.

A public storefront URL per wallet is **out of the MVP** (see [roadmap](roadmap.md)). The B2C core is charging at the counter while the buyer signs offline.
