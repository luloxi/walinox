# Roadmap — fuera del MVP actual

**MVP (agosto 2026):** pagos sin internet del lado del **comprador**, para **B2B y B2C**.

Flujo núcleo: armar cobro (monto o productos) → el comprador firma **sin red** → se pasa la firma por **QR / NFC / Bluetooth / sonido / luz / archivo / copiar** → el vendedor (o quien cobra) asienta on-chain cuando hay internet.

---

## MVP in scope

- Wallet local o externa (intermediario).
- **Billetera:** enviar online/offline, recibir, pedir, pagar (escanear pedido/firma).
- **Local (vendedor B2C):** listar productos, caja (POS), cobrar con **todos los canales offline** (`OfflineSend` / `ChannelRow`).
- Contactos mínimos.
- Actividad local de movimientos (sin reportes automáticos).
- Ajustes: moneda, wallet, avisos push, tema, copia en la nube (opcional, cuando hay internet).

## Quitado del MVP (sigue en roadmap)

### Tienda online / vitrina pública por wallet

- **Qué era:** marketplace comprador, link público `/tienda/[id]`, compartir vitrina, browse de tiendas ajenas, vales como producto aparte y canje de vales.
- **Por qué fuera:** no es el cobro offline en el mostrador. Es vitrina web, no el núcleo B2C de “cobrar sin red del comprador”.
- **Qué SÍ quedó en MVP:** **Local** — catálogo propio del vendedor + POS + canales offline.
- **Dónde vivía lo online:** `StoreShare`, tab comprador (`SHOW_STORE_BUYER`), `ProductBrowser` público, `/vales`, `RedeemView` en chrome de vendedor.
- **Estado:** fuera de la UI principal. Código puede quedar en el repo.

### Resumen / reporte automatizado

- **Qué era:** resumen mensual por push/inbox, prompt en Actividad, toggle en Ajustes.
- **Por qué fuera:** no ayuda al pago offline.
- **Estado:** fuera de Ajustes y sin prompt. **Actividad** manual sigue.

## Más adelante (ideas)

- Reactivar vitrina pública / vales / canje.
- Reportes mensuales y analytics.
- P2P más fuerte vía Pears/Hyperswarm.
- Recovery de seed más allá del PIN local.
