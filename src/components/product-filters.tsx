"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABEL,
  PRODUCT_CATEGORIES,
  PRODUCT_SORTS,
  type ProductSort,
} from "@/lib/categories";
import type { Store } from "@/lib/stores";
import { cn } from "@/lib/utils";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-8 shrink-0 cursor-pointer rounded-full px-3 text-xs",
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ProductFilters({
  query,
  onQuery,
  category,
  onCategory,
  store = "all",
  onStore,
  stores,
  sort,
  onSort,
}: {
  query: string;
  onQuery: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  store?: string;
  onStore?: (value: string) => void;
  stores?: Store[];
  sort: ProductSort;
  onSort: (value: ProductSort) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 md:flex-row">
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar productos"
          className="h-11 md:flex-1"
          aria-label="Buscar productos"
        />
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as ProductSort)}
          className="h-11 w-full cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground md:w-52 dark:bg-input/30"
          aria-label="Ordenar productos"
        >
          {PRODUCT_SORTS.map((item) => (
            <option key={item.id} value={item.id}>
              Orden: {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <Chip active={category === "all"} onClick={() => onCategory("all")}>
          Categorías
        </Chip>
        {PRODUCT_CATEGORIES.map((id) => (
          <Chip key={id} active={category === id} onClick={() => onCategory(id)}>
            {CATEGORY_LABEL[id]}
          </Chip>
        ))}
      </div>
      {stores && stores.length > 1 && onStore ? (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <Chip active={store === "all"} onClick={() => onStore("all")}>
            Tiendas
          </Chip>
          {stores.map((item) => (
            <Chip key={item.id} active={store === item.id} onClick={() => onStore(item.id)}>
              {item.name}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
