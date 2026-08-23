# Walinox — brief para mentores

> **MVP actual (agosto 2026):** pagos **sin internet del comprador** (B2B + B2C caja/POS). Vitrina pública, vales/canje y reporte mensual automatizado están **fuera del MVP** — ver `docs/roadmap.md`. Guion para grabar: **`docs/demo.md`**.

Repo: `luloxi/walinox` · Demo: `walinox-nu.vercel.app` · Stack: Next.js PWA, Tether WDK, QVAC, USDT en Ethereum.

---

## 1. Presentación del proyecto

### En una frase

Walinox es una **billetera USDT auto-custodia** que deja **firmar un gasto sin internet** y pasárselo a otro celular (QR hoy; Bluetooth, NFC y sonido como canales). Los tokens **no se mueven en el aire**: se mueven cuando alguien, ya online, ejecuta esa firma on-chain.

### El problema

En un kiosco, una feria o un barrio con mal señal:

- Una wallet normal (MetaMask, exchange) **necesita red** para mandar USDT.
- “Stablecoin para el día a día” choca con gas en ETH, `permit()` que USDT **no tiene**, y UX de hex.
- Un comercio chico no quiere un POS cripto pesado. Quiere cobrar aunque el cliente no tenga datos.

### Qué hace Walinox

| Pieza | Para quién | Qué resuelve |
| --- | --- | --- |
| **Billetera** | Particular | Saldo USDT, ingresar/recibir/enviar/pagar online u offline |
| **Contactos** | Particular / comercio | Agenda mínima |
| **Tienda** | Vendedor (B2C) | Catálogo + caja (POS); el cliente firma offline; el local asienta USDT |
| **Actividad** | Los dos | Movimientos locales; link a Etherscan cuando hay tx |
| **Avisos** | Los dos | Inbox in-app y push PWA (si hay VAPID) |

No es un exchange, no custodia fondos, no emite USDT. Las claves las tiene el usuario (RainbowKit / MetaMask / Rabby, o una seed WDK local).

### Dos modos de “enviar plata”

```
ONLINE                         OFFLINE (sin red entre los dos teléfonos)
────────                       ────────────────────────────────────────
Wallet firma un ERC-20         Wallet firma EIP-712 (Permit2)
transfer.                      Se pasa el JSON firmado (QR / archivo / …).
Gas en USDT (WDK 7702          El receptor, cuando tenga internet,
+ paymaster Candide).          hace approve Permit2 (una vez) y
                               permitTransferFrom. Ahí sí se mueve el USDT.
```

Núcleo de la tesis: **separar “autorizar” de “asentar en la cadena”**.

### Demo que se puede mostrar

1. Login → billetera local o RainbowKit → términos (una vez).
2. Enviar online a un contacto (opcional).
3. **Tienda (dispositivo B):** armar caja → QR de cargo.
4. **Pagar (dispositivo A, sin red del comprador):** escanear → firmar Permit2 → devolver firma por QR.
5. **B confirma** on-chain cuando hay red.

Guion detallado para grabar: **`docs/demo.md`**.

### Stack Tether

- **WDK**: firma EIP-712 en el dispositivo; seed local cifrada con PIN.
- **WDK 7702-gasless**: envío online intenta gas en **USDT**.
- **QVAC**: “En una frase” para completar formularios. No es un chatbot.

---

## 2. Cómo se cuenta en 6 slides

1. **Gancho.** USDT es lo que la gente quiere gastar. ¿Y si el kiosco o el cliente no tienen Wi‑Fi?
2. **Idea.** Firmar ahora, asentar después. El QR es un cheque, no un wire.
3. **Por qué no ERC-2612.** USDT mainnet no tiene `permit()`. Permit2 es el estándar que ya usa Uniswap.
4. **Producto.** Billetera + contactos + tienda/POS offline + actividad.
5. **Compliance.** Settlement en USDT; sin custodia; el local confirma on-chain.
6. **Qué pedimos.** Feedback de tesis, riesgo (Permit2 approve) y go-to-market (comercio de barrio vs P2P).

---

## 3. Insights al construir

### 3.1 USDT no tiene `permit()`

USDT mainnet (`0xdAC17F958D2ee523a2206206994597C13D831ec7`) no implementa ERC-2612. Usamos **Uniswap Permit2**:

1. Una vez: `USDT.approve(Permit2, max)`.
2. Cada gasto offline: EIP-712 `PermitTransferFrom`.
3. El receptor llama `permitTransferFrom`. Ahí se mueve el token.

La firma viaja en un JSON (`SignedEnvelope`). Verificarla es `verifyTypedData` en el teléfono, sin RPC.

### 3.2 Firmar ≠ mover tokens

| Momento | Qué pasa | Internet |
| --- | --- | --- |
| Firma EIP-712 | Hay un **cheque** | No |
| Pase QR / archivo / tag | El otro tiene el cheque | No |
| `permitTransferFrom` | El USDT cambia de dueño | Sí (el que ejecuta) |

Si el receptor nunca sube la firma, el dinero no salió. El `deadline` caduca el cheque.

### 3.3 Gasless

Módulo `@tetherto/wdk-wallet-evm-7702-gasless` + paymaster Candide (rate-limited). Hace falta un poco más de USDT aparte del monto. Si falla el bundler, cae a EOA con ETH.

### 3.4 Canales offline (honestos)

| Canal | ¿Pasa el payload? | Notas |
| --- | --- | --- |
| **QR** | Sí | Camino demo. Avión OK después del primer load (PWA). |
| **Copy / archivo** | Sí | Siempre. |
| **Sonido / luz** | Sí | Transportan bytes en la PWA. |
| **Bluetooth** | Parcial | Share sheet; GATT entre dos Chromes no. |
| **NFC** | Parcial | Tag NDEF; no P2P tipo Beam. |

### 3.5 QVAC

Atajo de formulario (“En una frase”), no el producto. Sin QVAC, heurística local.

### 3.6 Límites conocidos

- Push durable en Vercel sin store durable.
- Seed cifrada en el dispositivo (no recovery cloud de la frase).
- Código legacy de vales/vitrina puede existir en el repo; **no es el pitch del MVP** (`docs/roadmap.md`).

---

## 4. Preguntas para mentores

- ¿“Cheque firmado, cobro después” se entiende frente a Mercado Pago?
- ¿El primer usuario real es el kiosco o el P2P entre conocidos?
- Approve a Permit2: ¿max o acotado por sesión?
- Offline “de verdad” en web vs companion nativo.
- Narrativa: case WDK/QVAC o “USDT en la calle”.

---

## 5. Listo vs no listo

**Listo para mostrar:** login, billetera, envío online/offline, QR ida y vuelta, contactos, tienda POS + catálogo, actividad, avisos, QVAC/heurística. Guion: `docs/demo.md`.

**No vender como listo:** BLE GATT entre PWAs, NFC P2P, push durable en Vercel, off-ramp ARS.

**Próximo:** calibrar canales en feria, allowance Permit2 acotado, on/off-ramp ARS, sacar seed de solo-dispositivo con mejor recovery.

---

## 6. Glosario

| Término | En criollo |
| --- | --- |
| EIP-712 | Mensaje estructurado que firmás. |
| Permit2 | Contrato Uniswap que honra firmas de gasto sobre USDT. |
| Envelope | JSON con typed data + signature (viaja por QR). |
| ChargeRequest | Pedido de cobro que arma la tienda antes de la firma. |
