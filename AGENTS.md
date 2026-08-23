<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Walinox

PWA de USDT auto-custodia. UI en español. Settlement siempre USDT.

## MVP

**Pagos sin internet del comprador** (B2B y B2C).

- **P2P / B2B:** enviar, recibir, pedir, pagar (escanear firma).
- **B2C / Tienda:** el vendedor lista productos, arma el pedido en caja y cobra con **todos los canales offline** (QR, NFC, Bluetooth, sonido, luz, archivo, copiar). El comprador firma sin red; el asiento on-chain puede esperar red del que cobra. En Tienda: pestaña **Cobrar** (default) y **Catálogo**.

Fuera del MVP (ver [`docs/roadmap.md`](docs/roadmap.md)): vitrina pública por wallet, marketplace comprador, vales/canje, resumen mensual automatizado. No los reenganches en nav salvo pedido explícito.

Persistencia multi-dispositivo: [`database.md`](database.md). Estado de app en localStorage; seed solo en el dispositivo (cifrada con PIN). Tras crear billetera local, mostrar frase de recuperación; en Ajustes → Seguridad se puede volver a ver con PIN.

## Cómo cambiar código

- Cambios quirúrgicos: tocá el mínimo de archivos y líneas.
- Si lo mismo se puede hacer con menos código sin romper comportamiento, hacelo.
- No saques scripts, dependencias, APIs, rutas ni config clave salvo pedido explícito.
- Sin rewrites cosméticos. Commits en **inglés**, cortos. Preferí **pocos commits densos** (Vercel se atasca con webhooks seguidos).

## Marie Kondo + interfaz amena e intuitiva

Cada cambio busca **alegría, orden y nada de más**. La interfaz tiene que ser **amena e intuitiva**.

- Si algo no aporta, sacalo o plegalo.
- **Dos opciones = un toque** (toggle), no select.
- Layout con aire: título y acción secundaria en la misma fila con `justify-between` donde sea sensato.
- Coherencia: tabs full-width, controles `h-11`, español.
- Deshacer reversible (~5 s) al borrar algo recuperable.
- Copy directo: afirmá qué es. Evitá frases del tipo “no es X, es Y” / “no confundir con…” salvo un constraint técnico real (Permit2, seed, etc.).

## Panel de review

Cuando el user pida review (Anton / Ramsay / Marie Kondo / Ratatouille):

1. Veredicto en una frase.
2. Qué está bien.
3. Qué está crudo / de más.
4. Prioridades (máx. 5).
5. Si hay DB/sync: seed nunca al server; saldo siempre chain.

Solo cuando el review aporta.

## Tether

Prácticas actuales de los paquetes instalados y [docs.wdk.tether.io](https://docs.wdk.tether.io).

- WDK corre en el cliente; seed en el dispositivo.
- USDT mainnet sin ERC-2612 `permit()`. Gastos firmados = Uniswap Permit2. Gas online = `@tetherto/wdk-wallet-evm-7702-gasless` (USDT); si falla, EOA con ETH.
- QVAC completa formularios con lenguaje natural (`README.md` tiene el modelo elegido).
- No copies convenciones internas de repos WDK (copyright, JSDoc `.d.ts`) a esta app.

Más: `docs/billetera.md`, `docs/roadmap.md`, `database.md`.

## Roadmap

Lo diferido está en **`docs/roadmap.md`**. Tienda (caja + productos + canales offline) es MVP.

## Comentarios

Pocos. Solo constraints no obvios (Permit2, 7702, sodium-javascript).
