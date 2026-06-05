import type { Product } from "@/data/products";

export type CatalogScope = "public" | "private";

export function matchesCatalogScope(product: Product, scope: CatalogScope): boolean {
  const isPrivate = Boolean(product.isPrivate);
  return scope === "private" ? isPrivate : !isPrivate;
}

export function filterProductsByCatalogScope(products: Product[], scope: CatalogScope): Product[] {
  return products.filter(
    (product) => !product.archived && !product.hidden && matchesCatalogScope(product, scope)
  );
}

export const catalogStorageKey = (scope: CatalogScope) =>
  scope === "private" ? "products-private" : "products";
