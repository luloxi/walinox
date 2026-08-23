# Cómo entra un usuario a Walinox

Walinox es **auto-custodia**: la app no guarda tu plata ni firma por vos en un servidor. Para **mandar, cobrar o comprar** hace falta una billetera Ethereum que firme. Para **mirar una tienda** (el link que comparte un local) no hace falta.

Hay **dos formas** de tener esa billetera. Las dos son una cuenta on-chain de verdad, con USDT en Ethereum.

---

## 1. Conectar una que ya tenés

Botón **Iniciar sesión** / **Conectar billetera**.

Se abre RainbowKit: MetaMask, Rabby, Rainbow, Trust, Ledger, o la extensión que el navegador ya tenga inyectada.

- Las claves **nunca** entran a Walinox: firman en la wallet de siempre.
- WalletConnect (QR al teléfono) solo si hay un project id real de Reown; el de ejemplo no anda en localhost.

Después de conectar: una firma de términos (una vez por address).

---

## 2. Billetera local (Tether WDK)

Botón **Billetera local**.

Crea o reabre una wallet en este navegador con el SDK de Tether (**WDK**).

En código (`src/lib/wallet.ts` / `seed-crypto.ts`):

1. `WDK.getRandomSeedPhrase(12)` si no hay vault.
2. Seed cifrada con PIN (AES-GCM) en `walinox.seed.v2`.
3. `new WDK(seed).registerWallet("ethereum", WalletManagerEvm, { provider })`.
4. Primera cuenta Ethereum = address del usuario.
5. Opcional: `@tetherto/wdk-wallet-evm-7702-gasless` para gas en USDT; si falla, EOA con ETH.

Al **crear** una cuenta nueva, la UI muestra la frase de 12 palabras y pide confirmar que se respaldó. En **Ajustes → Seguridad** se puede volver a ver con el PIN.

### Qué implica para el usuario

| | Extensión | Billetera local WDK |
| --- | --- | --- |
| Claves | En MetaMask / Rabby / etc. | En este navegador (vault cifrado) |
| Install | Sí | No |
| Backup | El de esa wallet | Anotar las 12 palabras |
| Firma | Popup de la extensión | En la página |
| Gas online | Según la wallet | Intenta USDT vía WDK 7702 |

WDK corre en el cliente. Tether no custodia la seed.

---

## Qué se puede hacer sin billetera

- Abrir un link de tienda.
- Ver productos y precios en moneda local.
- Iniciar sesión desde esa misma pantalla para comprar.

Sin billetera no hay saldo, envíos, caja, actividad ni ajustes.

---

## Flujo al entrar

```
Mirar tienda (público)
        │
        ▼
¿Tenés wallet?
   no ──► WDK crea/reabre seed local     sí ──► RainbowKit
        │                                         │
        └──────────────┬──────────────────────────┘
                       ▼
              Firma de términos (EIP-712, una vez)
                       ▼
              App: billetera, contactos, tienda, actividad, ajustes
```

Firmar no mueve USDT. El token se mueve cuando esa firma se publica on-chain.

---

## Tether en esta app

- **WDK** — crear cuenta, firmar EIP-712, transfer.
- **WDK 7702 gasless** — bundler en USDT cuando está disponible.
- **USDT** — settlement; UI con cotización de mercado a moneda local.
- **QVAC** — completa formularios con una frase.
