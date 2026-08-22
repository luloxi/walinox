export const FIATS = [
  { id: "ARS", name: "Peso argentino", country: "Argentina", source: "Dólar blue (P2P)", locale: "es-AR", decimals: 0 },
  { id: "VES", name: "Bolívar", country: "Venezuela", source: "Paralelo", locale: "es-VE", decimals: 0 },
  { id: "BRL", name: "Real", country: "Brasil", source: "Cotización USD", locale: "pt-BR", decimals: 2 },
  { id: "CLP", name: "Peso chileno", country: "Chile", source: "Cotización USD", locale: "es-CL", decimals: 0 },
  { id: "UYU", name: "Peso uruguayo", country: "Uruguay", source: "Cotización USD", locale: "es-UY", decimals: 0 },
  { id: "MXN", name: "Peso mexicano", country: "México", source: "Cotización USD", locale: "es-MX", decimals: 2 },
  { id: "COP", name: "Peso colombiano", country: "Colombia", source: "Cotización USD", locale: "es-CO", decimals: 0 },
  { id: "BOB", name: "Boliviano", country: "Bolivia", source: "Tipo de cambio", locale: "es-BO", decimals: 2 },
  { id: "PEN", name: "Sol", country: "Perú", source: "Tipo de cambio", locale: "es-PE", decimals: 2 },
  { id: "USD", name: "Dólar", country: "Estados Unidos", source: "Paridad con USDT", locale: "en-US", decimals: 2 },
  { id: "EUR", name: "Euro", country: "Zona euro", source: "Tipo de cambio", locale: "de-DE", decimals: 2 },
] as const;

export type FiatId = (typeof FIATS)[number]["id"];
export type DisplayPrimary = "fiat" | "usdt";

export type DisplayPrefs = {
  fiat: FiatId;
  primary: DisplayPrimary;
};

export const DISPLAY_KEY = "walinox.display";
export const DEFAULT_DISPLAY: DisplayPrefs = { fiat: "ARS", primary: "fiat" };

const IDS = new Set<string>(FIATS.map((item) => item.id));

export function isFiatId(value: string): value is FiatId {
  return IDS.has(value);
}

export function fiatMeta(id: FiatId): (typeof FIATS)[number] {
  return FIATS.find((item) => item.id === id) ?? FIATS[0];
}

export function fiatPrefix(id: FiatId): string {
  if (id === "VES" || id === "BOB") return "Bs";
  if (id === "BRL") return "R$";
  if (id === "EUR") return "€";
  if (id === "PEN") return "S/";
  return "$";
}

export function loadDisplay(): DisplayPrefs {
  if (typeof localStorage === "undefined") return DEFAULT_DISPLAY;
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    if (!raw) return DEFAULT_DISPLAY;
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>;
    const fiat = parsed.fiat && isFiatId(parsed.fiat) ? parsed.fiat : "ARS";
    const primary: DisplayPrimary = parsed.primary === "usdt" ? "usdt" : "fiat";
    return { fiat, primary };
  } catch {
    return DEFAULT_DISPLAY;
  }
}

export function saveDisplay(prefs: DisplayPrefs): void {
  if (typeof localStorage === "undefined") return;
  const fiat = isFiatId(prefs.fiat) ? prefs.fiat : "ARS";
  const primary: DisplayPrimary = prefs.primary === "usdt" ? "usdt" : "fiat";
  localStorage.setItem(DISPLAY_KEY, JSON.stringify({ fiat, primary }));
}
