# Roadmap — fuera del MVP actual

**MVP (agosto 2026):** una sola cosa bien hecha — **pagos sin internet del lado del comprador** para B2B y B2C (firmar offline → pasar la firma por QR u otro canal → asentar on-chain cuando hay red).

Todo lo listado acá **se sacó de la experiencia principal** (nav, ajustes, copy). El código puede seguir en el repo para reactivar después; no es producto del MVP.

---

## Quitado del MVP (2026-08-23)

### Tienda online / local propio por wallet

- **Qué era:** catálogo por address, POS vendedor, productos con foto, vales de bienes físicos, link público `/tienda/[id]`, comprador/vendedor, canje de vales.
- **Por qué fuera del MVP:** no es el núcleo “firmar sin internet y cobrar cuando hay red”. Diluye el foco.
- **Dónde vivía:** nav “Tienda”, link en billetera, rutas `/tienda`, `/products`, `/vales`, componentes `tienda-view`, `pos-view`, `product-*`, `vales-*`, `store-*`, `catalog`, etc.
- **Estado:** oculto de la UI principal. Reactivar = volver a enganchar nav + entry points (ver historial git / este doc).
- **Nota previa (AGENTS):** el tab comprador ya estaba apagado con `SHOW_STORE_BUYER = false`; ahora **toda** la tienda online queda fuera del MVP, no solo el tab comprador.

### Resumen / reporte automatizado

- **Qué era:** resumen mensual por push/inbox, prompt en Actividad, toggle en Ajustes (“Resumen mensual”).
- **Por qué fuera del MVP:** automatización de reporting no ayuda al pago offline del comprador.
- **Dónde vivía:** `src/lib/monthly-report.ts`, sección Reporte en `settings-view`, prompt en `summary-view`.
- **Estado:** quitado de Ajustes y del prompt de Actividad. La pantalla **Actividad** (historial manual de movimientos) **sí sigue** — no es el reporte automático.

---

## MVP in scope

- Wallet local o externa (intermediario).
- Enviar online / offline (Permit2 + canales).
- Recibir: address, pedir monto, escanear/validar firma y confirmar cobro.
- Contactos mínimos para repetir destinos.
- Actividad local de firmas/movimientos (sin automatización de reportes).
- Ajustes: moneda, wallet, avisos push opcionales, tema.

## Más adelante (ideas, no compromiso)

- Reactivar tienda / vales / POS catalog.
- Reportes mensuales y analytics.
- Mejoras de canales offline (P2P real vía Pears/Hyperswarm).
- Seed con recovery más allá del PIN local.
