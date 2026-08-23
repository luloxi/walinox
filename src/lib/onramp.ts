/** Tether WDK preferred fiat on-ramp is MoonPay (@tetherto/wdk-protocol-fiat-moonpay). */

export function moonpayPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_MOONPAY_API_KEY?.trim();
  return key || null;
}

export function moonpayBuyBase(params: {
  apiKey: string;
  walletAddress?: string;
  fiat?: string;
  theme?: "dark" | "light";
}): string {
  const host = params.apiKey.startsWith("pk_test")
    ? "https://buy-sandbox.moonpay.com"
    : "https://buy.moonpay.com";
  const q = new URLSearchParams({
    apiKey: params.apiKey,
    defaultCurrencyCode: "usdt",
    baseCurrencyCode: (params.fiat ?? "ars").toLowerCase(),
    colorCode: "%230d9488",
    language: "es",
  });
  if (params.theme) q.set("theme", params.theme);
  if (params.walletAddress) q.set("walletAddress", params.walletAddress);
  return `${host}?${q.toString()}`;
}

export async function openOnramp(input: {
  walletAddress: string;
  fiat?: string;
  theme?: "dark" | "light";
}): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const apiKey = moonpayPublicKey();
  if (!apiKey) {
    return {
      ok: false,
      reason:
        "Falta NEXT_PUBLIC_MOONPAY_API_KEY. El onramp de Tether/WDK es MoonPay: creá una cuenta en moonpay.com/dashboard y pegá la publishable key.",
    };
  }

  let url = moonpayBuyBase({
    apiKey,
    walletAddress: input.walletAddress,
    fiat: input.fiat,
    theme: input.theme,
  });

  try {
    const res = await fetch("/api/onramp/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data.url) url = data.url;
    }
  } catch {
    /* unsigned still usable without wallet lock-in */
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true, url };
}
