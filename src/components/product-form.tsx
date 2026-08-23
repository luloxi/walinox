"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QvacHint } from "@/components/qvac-hint";
import { useWallet } from "@/components/wallet-provider";
import { useDisplay } from "@/components/display-provider";
import { useFx } from "@/components/use-fx";
import { fiatMeta } from "@/lib/display";
import { formatFiat, formatUsdt, parsePriceField, usdtToFiat } from "@/lib/fx";
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
  const [price, setPrice] = useState("");
  const [place, setPlace] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function publish() {
    if (!wallet) return;
    if (!title.trim() || !price || !place.trim()) {
      setError("Completá qué vendés, el precio y dónde se retira");
      return;
    }
    if (!ok) {
      setError("Confirmá que lo vas a entregar");
      return;
    }
    const usdt = parsePriceField(price, fx.perUsdt, prefs.fiat);
    if (!usdt) {
      setError("Precio inválido");
      return;
    }
    const createdAt = new Date().toISOString();
    const name = "Mi local";
    const product: Product = {
      id: productIdFor(wallet.address, title, createdAt),
      storeId: wallet.address.toLowerCase(),
      title: title.trim(),
      description: "",
      image,
      price: usdt,
      supply: 99,
      sold: 0,
      terms: DEFAULT_TERMS,
      issuerName: name,
      redemptionPlace: place.trim(),
      issuer: wallet.address,
      createdAt,
      category,
    };
    saveProduct(product);
    setTitle("");
    setCategory("almacen");
    setPrice("");
    setPlace("");
    setImage(undefined);
    setOk(false);
    setError(null);
    onPublished?.();
    if (!onPublished) router.push(`/tienda/${wallet.address.toLowerCase()}`);
  }

  const parsedUsdt = price ? parsePriceField(price, fx.perUsdt, prefs.fiat) : "";

  return (
    <div className={embedded ? "space-y-2" : "mx-auto w-full max-w-lg pb-6 space-y-2"}>
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
      <Input
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        placeholder={`Precio en ${local.name.toLowerCase()}`}
        inputMode="decimal"
        className="h-11"
      />
      {parsedUsdt ? (
        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {formatUsdt(parsedUsdt, 6)}
          <UsdtLogo className="size-3" />
          <span>
            {local.source} ({formatFiat(fx.perUsdt, prefs.fiat)})
          </span>
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Precio en {local.name.toLowerCase()}. Se cobra en USDT ({local.source}: {formatFiat(fx.perUsdt, prefs.fiat)}).
        </p>
      )}
      <Input
        value={place}
        onChange={(event) => setPlace(event.target.value)}
        placeholder="Dónde se retira"
        className="h-11"
      />
      {wallet ? (
        <QvacHint
          task="product"
          owner={wallet.address}
          placeholder="vendo café a 14000 pesos, retiro en San Martín 100"
          onFill={(intent) => {
            if (intent.title) setTitle(intent.title);
            if (intent.price) {
              const n = Number(intent.price);
              setPrice(
                Number.isFinite(n) && n > 0 && n < 100
                  ? String(Math.round(usdtToFiat(n, fx.perUsdt)))
                  : intent.price,
              );
            }
            if (intent.place) setPlace(intent.place);
          }}
        />
      ) : null}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={ok}
          onChange={(event) => setOk(event.target.checked)}
          className="size-4 cursor-pointer accent-primary"
        />
        Lo voy a entregar
      </label>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <Button type="button" className="h-12 w-full" disabled={!wallet} onClick={publish}>
        Publicar
      </Button>
    </div>
  );
}
