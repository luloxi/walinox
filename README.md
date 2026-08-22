# Walinox

Local-first PWA: turn a sentence into a signed spend authorization, sign it on-device with Tether WDK (EIP-712), and hand it to another phone without internet.

EIP-712 only signs. Tokens move when something on-chain consumes that signature:

- **USDC** (and other permit tokens) → ERC-2612 `permit()`, then `transferFrom`
- **USDT** on Ethereum has no `permit()` → Uniswap **Permit2** `permitTransferFrom` (approve Permit2 once, then signatures work)

## Tether tech

- **QVAC** (`@qvac/sdk`): NL → structured intent. Falls back to a heuristic parser if no model is loaded.
- **WDK** (`@tetherto/wdk` + `@tetherto/wdk-wallet-evm`): self-custodial seed, `signTypedData`.

## Install and run

Node 22.17+.

```bash
cd /home/lulox/repos/walinox
npm install
npm test
npm run build
npm start
```

Open http://localhost:3000 — or `npm run dev` while hacking.

Optional QVAC: `qvac serve openai` then `QVAC_BASE_URL=http://127.0.0.1:11434/v1 npm start`

## Demo (USDT via Permit2)

1. Create: sample prompt allows 100 USDT → Compose → Sign with WDK (Permit2 typed data).
2. Transmit: QR (or Copy / File). Airplane mode is fine after first load.
3. Receive: Scan. If valid, **Approve Permit2 once** (first time only, needs gas) then **Submit via Permit2**.
4. USDC prompts still use ERC-2612 `permit()`.

PWA: HTTPS or localhost → Android Chrome **Install app** / iOS Safari **Add to Home Screen**.

## Limits

QVAC does not run in the browser. Seed is in `localStorage`. BLE/NFC/sound/light are thin; QR is the demo path. Broadcast needs gas. Live USDT needs real tokens + ETH (or a fork).
