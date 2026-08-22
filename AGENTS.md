<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Walinox

PWA de USDT auto-custodia. UI en español. Settlement siempre USDT.

## Cómo cambiar código

- Cambios quirúrgicos: tocá el mínimo de archivos y líneas. Preferí editar lo que ya existe a agregar wrappers, capas o archivos.
- Si lo mismo se puede hacer con menos código **sin romper comportamiento**, hacelo.
- No “optimices” achicando el producto: no saques scripts, dependencias, APIs, rutas ni config de `package.json` / `next.config.ts` / `tsconfig.json` / `components.json` / tools clave, salvo que el pedido lo pida.
- No rewrites ni refactors cosméticos. Andá rápido, puntual, con buenas prácticas.

## Tether

Siempre las prácticas **actuales** de Tether, no las de entrenamiento.

- Antes de tocar WDK / QVAC / gas 7702, leé los paquetes instalados (`node_modules/@tetherto/wdk`, `wdk-wallet-evm`, `wdk-wallet-evm-7702-gasless`, `@qvac/sdk`: README, `AGENTS.md`, types) y [docs.wdk.tether.io](https://docs.wdk.tether.io).
- No inventes APIs, un `permit()` de Tether, ni “Tether paga el gas”.
- WDK es no-custodial y corre en el cliente. La seed queda en el dispositivo; nunca en servidor.
- USDT mainnet **no** tiene ERC-2612 `permit()`. Gastos firmados = Uniswap Permit2. Transfer on-chain = ERC-20. Gas online = `@tetherto/wdk-wallet-evm-7702-gasless` (el bundler se paga en USDT); si falla, EOA (esa pide ETH).
- QVAC rellena campos (“¿en una frase?”). No es chat ni la billetera.
- No copies convenciones internas de los repos WDK (copyright, JSDoc para `.d.ts`) a esta app.

Más contexto: `docs/billetera.md`, `docs/mentores.md`.

## Comentarios

- No escribas comentarios de más. El código tiene que leerse solo.
- Si encontrás un comentario inútil, borralo.
- Si hay un constraint no obvio, explicalo bien — idealmente sobre Tether/USDT/Permit2/7702/QVAC (por qué no `permit()`, por qué gasless→EOA, por qué `sodium-javascript`).
