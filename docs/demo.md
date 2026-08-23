# Guion de demo — Walinox

**Objetivo:** en 2–3 minutos se entiende el núcleo: *el comprador paga en USDT sin internet; el que cobra asienta después*.

**URL:** https://walinox-nu.vercel.app  
**Mejor en:** dos teléfonos (o un teléfono + notebook). Chrome/Safari. Ideal con PWA instalada o al menos la app abierta en ambos.

---

## Antes de grabar (5 min)

1. Abrí la app en **dos dispositivos** (A = comprador, B = vendedor/cobrador).
2. En cada uno: **Billetera local** → PIN → (si es cuenta nueva) anotá/confirmá seed → firmá términos si pide.
3. Dejá **un producto** en Tienda → Catálogo en el dispositivo B (ej. “Café”, precio en USDT o moneda local).
4. Si hay saldo de demo en localhost, bien. En prod necesitás USDT real o mostrar solo la **firma offline** (el asiento on-chain puede quedar para el final o skip).
5. Silenciá notificaciones del sistema. Orientación vertical. Brillo alto para el QR.

**No demuestres en el video principal:** vitrina pública, vales/canje, reporte mensual automatizado (están fuera del MVP / roadmap).

---

## Guion hablado (≈ 2:30)

### 0. Gancho (15 s)

> “En LATAM la señal falla y el efectivo es un problema. Walinox deja pagar en USDT aunque el comprador no tenga internet: firmás ahora, se asienta on-chain cuando hay red.”

Mostrar landing un segundo → **Empezar** / ya logueado.

### 1. Billetera (20 s)

Pantalla Billetera en A:

> “Auto-custodia. Saldo en USDT, referencia en pesos. Cuatro acciones: Ingresar, Recibir, Enviar, Pagar.”

Señalá el botón verde **Pagar** del navbar (centro, sobresale).

### 2. Armar el cobro en la tienda (40 s) — dispositivo B

Tienda → pestaña **Cobrar**:

> “El local arma la caja: elige productos o un monto, genera el pedido.”

Tocá productos / cobrá → generá el **QR del cargo** (ChargeRequest).

> “Esto no mueve plata todavía. Es el pedido que el comprador va a firmar.”

### 3. Pagar offline (50 s) — dispositivo A

En A: modo avión **o** al menos narrar “sin datos del comprador”.

Navbar **Pagar** (o Billetera → Pagar) → escanear el QR del cargo de B.

> “El comprador ve el monto, firma Permit2 en el teléfono. USDT en mainnet no tiene permit nativo; usamos el estándar Permit2 de Uniswap.”

Confirmar firma → aparece la firma para devolver (QR / copiar / otros canales).

> “Pasamos la firma de vuelta al local — acá con QR, también sirve NFC, Bluetooth, sonido, archivo.”

Mostrar QR de la firma en A; B escanea / pega.

### 4. Asentar (30 s) — dispositivo B

B valida la firma → **confirmar / publicar** on-chain (si hay red + fondos/gas).

> “Recién acá se mueve el USDT. El comprador pudo estar todo el tiempo sin señal.”

Si no hay mainnet/gas en el momento del video:

> “En la demo de hackathon a veces paramos en la firma válida: el asiento es la misma tx Permit2 cuando hay red.”

Mostrar recibo / movimiento reciente en Tienda o Actividad.

### 5. Extra rápido si sobra tiempo (20–40 s)

Elegí **uno**:

- **Enviar** con QVAC: “En una frase” → `mandale 1 USDT a …` y se completan campos.
- **Contactos:** guardar address con nombre.
- **Ajustes:** PIN + biometría, moneda local con banderita.
- **Ingresar:** on-ramp MoonPay (si hay API key); si no, no insistir.

### 6. Cierre (15 s)

> “Walinox: pagos USDT sin internet del lado del comprador, auto-custodia, caja para el local. Firmás ahora, liquidás después.”

URL en pantalla: `walinox-nu.vercel.app`.

---

## Checklist de toma (orden recomendado)

| # | Plano | Dispositivo | Qué se ve |
| --- | --- | --- | --- |
| 1 | Landing / home | A | Hook + Empezar |
| 2 | Billetera | A | Saldo + 4 botones |
| 3 | Tienda → Cobrar | B | Productos / monto → QR cargo |
| 4 | Pagar + firma | A | Scan → firmar → QR firma |
| 5 | Confirmar | B | Scan firma → OK / tx |
| 6 | Cierre | A o B | URL + one-liner |

## Plan B (un solo teléfono)

1. Login billetera local.
2. Tienda → Catálogo → crear producto.
3. Cobrar → mostrar QR de cargo.
4. Billetera → Pagar → pegar/cargar el cargo (copiar JSON si no hay segundo cam).
5. Firmar → mostrar canales offline.
6. Narrar el asiento on-chain sin obligar la tx en vivo.

## Frases que no decir

- No digas que custodiás fondos o que “la app mueve la plata sola”.
- No digas “dólar blue”; la referencia es cotización de mercado USDT.
- No vendas vitrina pública / vales como feature actual.
- No prometas off-ramp a pesos como listo (está en roadmap).

## Si algo falla en vivo

| Problema | Qué hacer |
| --- | --- |
| Cámara QR no abre | Usar **Copiar / archivo** y narrar el mismo flujo |
| Sin USDT / sin gas | Parar en “firma válida”; mostrar el envelope |
| Pide PIN a cada rato | Desbloquear una vez antes de grabar; 5 min de inactividad re-bloquean |
| QVAC no responde | Completar el form a mano; QVAC es atajo, no el núcleo |
| Deploy raro | URL de Vercel + captura previa de los pasos clave |

## One-liners de respaldo

- “Es un cheque digital en USDT: lo firmás offline y se cobra cuando hay red.”
- “El local no depende del Wi‑Fi del cliente.”
- “Claves en tu dispositivo. Settlement en Ethereum con Permit2.”
