# Tooltips (`Hint`) — cómo estaban y cómo volver a ponerlos

Los sacamos de la UI (ensuciaban). El componente sigue en `src/components/hint.tsx`.

## Cómo funcionaba

- Un botón `?` (`CircleHelp`) abre un modal (portal) con el texto, Copiar y Cerrar.
- Escape y click afuera cierran. `cursor: pointer` en el botón.
- `SectionBar` aceptaba `hint?: string` y, si venía, renderizaba `<Hint text={hint} />` a la derecha, **sin título** al lado.

Para reactivarlos en una barra:

```tsx
import { Hint } from "@/components/hint";

// En SectionBar:
{hint ? <Hint text={hint} /> : null}

<SectionBar hint="…">
  {children}
</SectionBar>
```

O sueltos: `<Hint text="…" />`.

## Textos que había

| Dónde | Texto |
| --- | --- |
| Billetera / saldo | El saldo se muestra en moneda local con cotización USDT de mercado. En localhost es de prueba. El asiento on-chain es USDT. |
| Contactos | Guardá una address con nombre. El historial se arma solo. |
| Enviar | Online: la wallet conectada firma y manda USDT. Sin internet: firmás un permiso y lo pasás por QR. |
| Depositar | Mostrá tu address o escaneá un permiso firmado offline. |
| Actividad | Ingresos y gastos de este período. Tienda es compra/venta de vales; personal es envío entre wallets. |
| Billetera / últimos movimientos | Los últimos cinco. Tocá Ver todos para el historial completo. |
| Tienda | En el local el vendedor arma el pedido y lo cobra. El cliente firma sin internet. El local confirma on-chain. |
| Publicar producto | Lo publicás. El cliente paga. Le das el vale. Cuando viene, lo canjeás. |
| Detalle de producto | `Retiro: ${redemptionPlace}` |
| Detalle (dar vale) | El cliente ya pagó. Poné su address y se arma el vale. |
| Página de tienda | Lugar del local, o: Catálogo de este local. Pagás en USDT; el precio se ve en moneda local. |
| Ajustes | Tema, firma, avisos y la wallet. Nada de esto mueve fondos por sí solo. |

No es lo mismo que `QvacHint` (“¿en una frase?”): eso completa formularios, no es un tooltip.
