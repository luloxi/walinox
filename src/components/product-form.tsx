"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/components/wallet-provider";
import { saveProduct } from "@/lib/catalog";
import { COMPLIANCE_LINES, productIdFor, type Product } from "@/lib/vale";

export function ProductForm() {
  const { wallet } = useWallet();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [supply, setSupply] = useState("10");
  const [issuerName, setIssuerName] = useState("");
  const [place, setPlace] = useState("");
  const [terms, setTerms] = useState("");
  const [expiresDays, setExpiresDays] = useState("90");
  const [image, setImage] = useState<string | undefined>();
  const [checks, setChecks] = useState(COMPLIANCE_LINES.map(() => false));
  const [error, setError] = useState<string | null>(null);

  function toggle(index: number) {
    setChecks((current) => current.map((value, i) => (i === index ? !value : value)));
  }

  async function onImage(file: File) {
    if (file.size > 350_000) {
      setError("La imagen tiene que pesar menos de 350 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  function publish() {
    if (!wallet) return;
    if (!title.trim() || !price || !issuerName.trim() || !place.trim() || !terms.trim()) {
      setError("Completá título, precio, comercio, lugar y términos");
      return;
    }
    if (checks.some((value) => !value)) {
      setError("Tenés que aceptar las cuatro declaraciones de compliance");
      return;
    }
    const createdAt = new Date().toISOString();
    const days = Number(expiresDays);
    const product: Product = {
      id: productIdFor(wallet.address, title, createdAt),
      title: title.trim(),
      description: description.trim(),
      image,
      price,
      supply: Math.max(1, Number(supply) || 1),
      sold: 0,
      terms: terms.trim(),
      issuerName: issuerName.trim(),
      redemptionPlace: place.trim(),
      expiresAt:
        Number.isFinite(days) && days > 0
          ? String(Math.floor(Date.now() / 1000) + days * 24 * 60 * 60)
          : undefined,
      issuer: wallet.address,
      createdAt,
    };
    saveProduct(product);
    router.push(`/products/${product.id}`);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-lg flex-col overflow-y-auto">
      <h2 className="text-lg font-semibold">Publicar producto</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Cada unidad vendida es un NFT vale: se paga en USDT y se canjea por el bien físico.
      </p>
      <div className="mt-4 space-y-2 pb-4">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre del producto" className="h-10" />
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descripción"
          rows={2}
        />
        <Input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Precio en USDT"
          inputMode="decimal"
          className="h-10"
        />
        <Input
          value={supply}
          onChange={(event) => setSupply(event.target.value)}
          placeholder="Unidades"
          inputMode="numeric"
          className="h-10"
        />
        <Input
          value={issuerName}
          onChange={(event) => setIssuerName(event.target.value)}
          placeholder="Nombre del comercio / emisor"
          className="h-10"
        />
        <Input
          value={place}
          onChange={(event) => setPlace(event.target.value)}
          placeholder="Dónde se canjea"
          className="h-10"
        />
        <Input
          value={expiresDays}
          onChange={(event) => setExpiresDays(event.target.value)}
          placeholder="Días de validez"
          inputMode="numeric"
          className="h-10"
        />
        <Textarea
          value={terms}
          onChange={(event) => setTerms(event.target.value)}
          placeholder="Términos de canje (no reembolsable en efectivo, una unidad, etc.)"
          rows={3}
        />
        <Input
          type="file"
          accept="image/*"
          className="cursor-pointer"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImage(file);
          }}
        />
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-24 w-24 rounded-xl object-cover" />
        ) : null}

        <div className="space-y-2 rounded-2xl border border-white/10 p-3">
          <p className="text-xs font-medium">Compliance</p>
          {COMPLIANCE_LINES.map((line, index) => (
            <label key={line} className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed">
              <input
                type="checkbox"
                checked={checks[index]}
                onChange={() => toggle(index)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-teal-400"
              />
              {line}
            </label>
          ))}
        </div>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <Button type="button" className="h-11 w-full" disabled={!wallet} onClick={publish}>
          Publicar vale NFT
        </Button>
      </div>
    </div>
  );
}
