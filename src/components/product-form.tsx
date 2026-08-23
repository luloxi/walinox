"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QvacHint } from "@/components/qvac-hint";
import { UnitToggle } from "@/components/unit-toggle";
import { useWallet } from "@/components/wallet-provider";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { fiatMeta, fiatPrefix } from "@/lib/display";
import { fiatToUsdt, formatFiat, formatUsdt, usdtToFiat } from "@/lib/fx";
import { UsdtLogo } from "@/components/usdt-logo";
import { PRODUCT_GROUPS, type ProductCategory } from "@/lib/categories";
import { saveProduct } from "@/lib/catalog";
import { DEFAULT_TERMS, productIdFor, type Product } from "@/lib/vale";

export function ProductForm({
  embedded = false,
  onPublished,
}: {
  embedded?: boolean;
  onPublished?: () => void;
}) {
  const { wallet } = useWallet();
  const { prefs } = useDisplay();
  const fx = useFx();
  const local = fiatMeta(prefs.fiat);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProductCategory>("almacen");
  const [unit, setUnit] = useState<"fiat" | "usdt">(prefs.primary);
  const [amountInput, setAmountInput] = useState("");
  const [exactUsdt, setExactUsdt] = useState<string | null>(null);
  const [image, setImage] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const amountUsdt =
    exactUsdt ??
    (amountInput.trim()
      ? unit === "usdt"
        ? amountInput.trim()
        : fiatToUsdt(amountInput, fx.perUsdt)
      : "");

  function switchUnit(next: "fiat" | "usdt") {
    if (next === unit) return;
    const current = amountUsdt;
    setUnit(next);
    if (!current || Number(current) <= 0) {
      setAmountInput("");
      setExactUsdt(null);
      return;
    }
    setExactUsdt(current);
    if (next === "usdt") setAmountInput(current);
    else setAmountInput(String(Math.round(usdtToFiat(current, fx.perUsdt))));
  }

  function publish() {
    if (!wallet) return;
    if (!title.trim() || !amountUsdt || Number(amountUsdt) <= 0) {
      setError("Completá qué vendés y el precio");
      return;
    }
    const createdAt = new Date().toISOString();
    const product: Product = {
      id: productIdFor(wallet.address, title, createdAt),
      storeId: wallet.address.toLowerCase(),
      title: title.trim(),
      description: "",
      image,
      price: amountUsdt,
      supply: 99,
      sold: 0,
      terms: DEFAULT_TERMS,
      issuerName: "Mi tienda",
      redemptionPlace: "",
      issuer: wallet.address,
      createdAt,
      category,
    };
    saveProduct(product);
    setTitle("");
    setCategory("almacen");
    setAmountInput("");
    setExactUsdt(null);
    setUnit(prefs.primary);
    setImage(undefined);
    setError(null);
    onPublished?.();
    if (!onPublished) router.push("/tienda");
  }

  return (
    <div className={embedded ? "space-y-2" : "mx-auto w-full max-w-lg pb-6 space-y-2"}>
      {wallet ? (
        <QvacHint
          task="product"
          owner={wallet.address}
          placeholder="vendo café a 14000 pesos"
          onFill={(intent) => {
            if (intent.title) setTitle(intent.title);
            if (intent.price) {
              const n = Number(intent.price);
              if (Number.isFinite(n) && n > 0 && n < 100) {
                setUnit("usdt");
                setExactUsdt(String(n));
                setAmountInput(String(n));
              } else {
                setUnit("fiat");
                setExactUsdt(null);
                setAmountInput(intent.price);
              }
            }
          }}
        />
      ) : null}
      <label className="flex cursor-pointer flex-col gap-1">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-28 w-full rounded-xl object-cover" />
        ) : (
          <span className="flex h-28 cursor-pointer items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground ring-1 ring-border">
            Foto del producto
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setImage(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Qué vendés" className="h-11" />
      <select
        value={category}
        onChange={(event) => setCategory(event.target.value as ProductCategory)}
        className="h-11 w-full cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        aria-label="Categoría"
      >
        {PRODUCT_GROUPS.map((group) => (
          <optgroup key={group.id} label={group.label}>
            {group.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="flex h-11 items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-inset focus-within:ring-ring/50 dark:bg-input/30">
        <span className="pl-3 text-sm text-muted-foreground" aria-hidden="true">
          {unit === "fiat" ? fiatPrefix(prefs.fiat) : null}
          {unit === "usdt" ? <UsdtLogo className="size-4" /> : null}
        </span>
        <Input
          value={amountInput}
          onChange={(event) => {
            setExactUsdt(null);
            setAmountInput(event.target.value);
          }}
          placeholder="0"
          inputMode="decimal"
          className="h-11 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          aria-label={unit === "usdt" ? "Precio en USDT" : `Precio en ${local.name}`}
        />
        <UnitToggle value={unit} fiatLabel={prefs.fiat} onChange={switchUnit} className="mr-1" />
      </div>
      {amountUsdt && Number(amountUsdt) > 0 ? (
        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {unit === "fiat" ? (
            <>
              {formatUsdt(amountUsdt, 6)}
              <UsdtLogo className="size-3" />
            </>
          ) : (
            formatFiat(usdtToFiat(amountUsdt, fx.perUsdt), prefs.fiat)
          )}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Se cobra en USDT. Tocá {prefs.fiat} o USDT para ingresar el precio.
        </p>
      )}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <Button type="button" className="h-12 w-full" disabled={!wallet} onClick={publish}>
        Publicar
      </Button>
    </div>
  );
}
