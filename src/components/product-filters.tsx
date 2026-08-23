"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  PRODUCT_GROUPS,
  PRODUCT_SORTS,
  groupOfCategory,
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
        "h-9 shrink-0 cursor-pointer rounded-full px-3 text-xs font-medium",
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
  stores,
  sort,
  onSort,
  showSort = true,
}: {
  query: string;
  onQuery: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  stores?: Store[];
  sort: ProductSort;
  onSort: (value: ProductSort) => void;
  showSort?: boolean;
}) {
  const selectedGroup = PRODUCT_GROUPS.find((group) => group.id === groupOfCategory(category));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row">
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar productos"
          className="h-11 md:flex-1"
          aria-label="Buscar productos"
        />
        {showSort ? (
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
        ) : null}
      </div>

      {stores && stores.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Tiendas</p>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {stores.map((item) => (
              <Link
                key={item.id}
                href="/tienda"
                className="flex h-11 shrink-0 cursor-pointer flex-col justify-center rounded-xl border border-border bg-card px-3 hover:bg-muted"
              >
                <span className="text-xs font-medium leading-tight">{item.name}</span>
                {item.place ? (
                  <span className="text-[10px] text-muted-foreground">{item.place}</span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">Categorías</p>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <Chip active={category === "all"} onClick={() => onCategory("all")}>
            Todas
          </Chip>
          {PRODUCT_GROUPS.map((group) => {
            const on = category === group.id || groupOfCategory(category) === group.id;
            return (
              <Chip key={group.id} active={on} onClick={() => onCategory(group.id)}>
                {group.label}
              </Chip>
            );
          })}
        </div>
        {selectedGroup ? (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <Chip active={category === selectedGroup.id} onClick={() => onCategory(selectedGroup.id)}>
              Todas
            </Chip>
            {selectedGroup.items.map((item) => (
              <Chip key={item.id} active={category === item.id} onClick={() => onCategory(item.id)}>
                {item.label}
              </Chip>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
