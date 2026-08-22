import Link from "next/link";
import { Price } from "@/components/price";
import { categoryLabel } from "@/lib/categories";
import type { Product } from "@/lib/vale";

export function ProductTile({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${encodeURIComponent(product.id)}`}
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card hover:bg-muted"
    >
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt="" className="h-32 w-full object-cover md:h-40" />
      ) : (
        <div className="flex h-32 items-center justify-center bg-muted text-xs text-muted-foreground">
          Sin foto
        </div>
      )}
      <span className="space-y-1 px-3 py-2">
        <span className="block text-sm font-medium leading-tight">{product.title}</span>
        <span className="block text-[11px] text-muted-foreground">
          {categoryLabel(product.category)} · {product.issuerName}
        </span>
        <Price usdt={product.price} size="sm" />
      </span>
    </Link>
  );
}

export function ProductRow({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${encodeURIComponent(product.id)}`}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-muted"
    >
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="size-11 shrink-0 rounded-lg bg-muted" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{product.title}</span>
        <span className="block text-[11px] text-muted-foreground">{categoryLabel(product.category)}</span>
      </span>
      <Price usdt={product.price} size="sm" className="items-end" />
    </Link>
  );
}
