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

## Textos alineados al MVP actual

| Dónde | Texto |
| --- | --- |
| Billetera / saldo | El saldo se muestra en moneda local con cotización USDT de mercado. El asiento on-chain es USDT. |
| Contactos | Guardá una address con nombre. |
| Enviar | Online: la wallet firma y manda USDT. Sin internet: firmás un permiso Permit2 y lo pasás por QR u otro canal. |
| Recibir | Mostrá tu address o pedí fondos. También podés tomar una firma offline de alguien. |
| Pagar | Escaneá un pedido de la tienda (o un cobro) y firmá. La tienda asienta on-chain después. |
| Ingresar | On-ramp fiat → USDT (MoonPay si hay API key). |
| Actividad | Ingresos y gastos registrados en este dispositivo. |
| Billetera / últimos movimientos | Los últimos movimientos. Tocá Ver todos para el historial. |
| Tienda | El vendedor arma el pedido en caja y cobra. El cliente firma sin internet. El local confirma on-chain. |
| Publicar producto | Nombre, precio (USDT o moneda local) y listo para la caja. |
| Ajustes | Moneda, tema, seguridad (PIN/biometría), avisos push. Nada de esto mueve fondos por sí solo. |

No es lo mismo que `QvacHint` (“En una frase”): eso completa formularios, no es un tooltip.
