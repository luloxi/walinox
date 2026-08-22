"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hint } from "@/components/hint";
import { useWallet } from "@/components/wallet-provider";
import { saveProduct } from "@/lib/catalog";
import { DEFAULT_TERMS, productIdFor, type Product } from "@/lib/vale";

export function ProductForm({ embedded = false }: { embedded?: boolean }) {
  const { wallet } = useWallet();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [place, setPlace] = useState("");
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
    const createdAt = new Date().toISOString();
    const name = "Mi local";
    const product: Product = {
      id: productIdFor(wallet.address, title, createdAt),
      storeId: wallet.address.toLowerCase(),
      title: title.trim(),
      description: "",
      price,
      supply: 99,
      sold: 0,
      terms: DEFAULT_TERMS,
      issuerName: name,
      redemptionPlace: place.trim(),
      issuer: wallet.address,
      createdAt,
    };
    saveProduct(product);
    setTitle("");
    setPrice("");
    setPlace("");
    setOk(false);
    setError(null);
    router.push(`/products/${product.id}`);
  }

  return (
    <div className={embedded ? "space-y-2" : "mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto"}>
      <div className="flex items-center">
        <span className="text-sm">Nuevo producto</span>
        <Hint text="Lo publicás. El cliente paga. Le das el vale. Cuando viene, lo canjeás." />
      </div>
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Qué vendés" className="h-11" />
      <Input
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        placeholder="Precio"
        inputMode="decimal"
        className="h-11"
      />
      <Input
        value={place}
        onChange={(event) => setPlace(event.target.value)}
        placeholder="Dónde se retira"
        className="h-11"
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={ok}
          onChange={(event) => setOk(event.target.checked)}
          className="size-4 cursor-pointer accent-teal-400"
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
