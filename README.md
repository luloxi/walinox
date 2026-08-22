# Walinox

Local-first PWA: turn a sentence into a signed spend authorization, sign it on-device with Tether WDK (EIP-712), and hand it to another phone without internet.

Walinox is **USDT on Ethereum**. EIP-712 only signs. Tokens move when something on-chain consumes that signature via Uniswap **Permit2** `permitTransferFrom` (approve Permit2 once, then signatures work). Mainnet USDT has no `permit()`.

## Contactos y vales NFT

Pensado para particulares y comercios.

- **Contactos:** se recuerdan al enviar (nombre opcional). Cada contacto tiene historial de movimientos con esa address.
- **Productos NFT:** un comercio publica un bien físico como vale. El comprador paga en USDT; el emisor firma un **EIP-712 Vale** (tokenId único). La posesión del JSON firmado es el título para canjear el objeto en el local.
- **Compliance:** al publicar hay que aceptar que el NFT es un vale de un bien físico (no un instrumento financiero), que el emisor entrega el bien, que hay lugar/plazo/términos, y que emisión y canje quedan registrados. El canje lo confirma el emisor al escanear el QR.

El vale vive off-chain (firma WDK) para no depender de un contrato ERC-721 desplegado. El pago sí es on-chain en USDT.

## Tether tech

- **QVAC** (`@qvac/sdk`): NL → structured intent. Falls back to a heuristic parser if no model is loaded.
- **WDK** (`@tetherto/wdk` + `@tetherto/wdk-wallet-evm`): self-custodial seed, `signTypedData`.
- **WDK gasless** (`@tetherto/wdk-wallet-evm-7702-gasless`): online txs pay gas in USDT. See below.

## Gasless (official Tether WDK)

A plain Ethereum EOA still needs ETH to pay gas. Tether does **not** ship a “Tether pays your gas for free” program, but it does ship an official gasless module: [`@tetherto/wdk-wallet-evm-7702-gasless`](https://www.npmjs.com/package/@tetherto/wdk-wallet-evm-7702-gasless).

That module:

1. Delegates the EOA to a smart account via **EIP-7702** (default implementation `0xe6Cae83BdE06E4c305530e199D7217f42808555B`).
2. Sends the call as an **ERC-4337** UserOperation.
3. Pays the bundler through a paymaster, either sponsored (needs a policy ID + API key) or in an ERC-20.

Walinox uses **paymaster-token mode**: gas is paid in **USDT**. No API key.

- Bundler + paymaster: Candide public `https://api.candide.dev/public/v3/1` (documented by the WDK module; rate-limited, no key).
- Paymaster token: mainnet USDT `0xdAC17F958D2ee523a2206206994597C13D831ec7`.
- First UserOp from a fresh account includes the EIP-7702 delegation; later ones reuse it.

Online send, Permit2 `approve`, ERC-2612 `permit()` submit, and Permit2 `permitTransferFrom` all try this path first. If the bundler/paymaster fails, the app falls back to a normal EOA transaction (that fallback **does** need ETH).

You need a little extra USDT in the wallet to cover the paymaster fee, on top of the amount you send.

Optional env (none required for the demo):

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_BUNDLER_URL` | Candide public mainnet |
| `NEXT_PUBLIC_PAYMASTER_URL` | omitted (Candide serves bundler + paymaster on one URL) |
| `NEXT_PUBLIC_RPC_URL` | `https://ethereum-rpc.publicnode.com` |

Sponsored (gas-free) mode exists in the same module (`isSponsored` + `sponsorshipPolicyId`) but needs a Candide or Pimlico dashboard policy. Not used here.

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

## Send

Paste an address or scan a QR, or type an **ENS** (`vitalik.eth`) / **Basename** (`alice.base.eth`). The send field is the Scaffold-ETH AddressInput: ENS avatar when the name has one, otherwise the colorful `blo` identicon for the 0x address.

The scanner also reads raw `0x…` (Walinox receive QR), EIP-681 (`ethereum:0x…`, ERC-20 `transfer?address=`), MetaMask/Trust deep links, Rabby/Binance JSON, CAIP-10, and `usdt:` / `tether:` / `bnb:` URIs.

## Demo (USDT via Permit2)

1. Create: sample prompt allows 100 USDT → Compose → Sign with WDK (Permit2 typed data).
2. Transmit: QR (or Copy / File). Airplane mode is fine after first load.
3. Receive: Scan. If valid, **Approve Permit2 once** (first time only; gas paid in USDT) then **Submit via Permit2**.

PWA: HTTPS or localhost → Android Chrome **Install app** / iOS Safari **Add to Home Screen**.

## Limits

QVAC does not run in the browser. Seed is in `localStorage`. BLE/NFC/sound/light are thin; QR is the demo path. Live USDT needs real tokens (plus a bit extra USDT for the paymaster). Candide public is rate-limited.
