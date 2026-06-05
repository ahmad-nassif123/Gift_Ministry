import { products as initialProducts, type Product } from "@/data/products";
import {
  catalogStorageKey,
  filterProductsByCatalogScope,
  type CatalogScope,
} from "@/lib/catalog-scope";

export const PRODUCTS_STORAGE_KEY = "products";

export function loadCatalogProductsFromLocalStorage(scope: CatalogScope = "public"): Product[] {
  const fallback = () => filterProductsByCatalogScope(initialProducts, scope);
  if (typeof window === "undefined") return fallback();
  try {
    const saved = localStorage.getItem(catalogStorageKey(scope));
    if (!saved) return fallback();
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return fallback();
    return parsed.filter(
      (p): p is Product =>
        p != null &&
        typeof p === "object" &&
        typeof (p as Product).slug === "string" &&
        !(p as Product).archived &&
        !(p as Product).hidden
    );
  } catch {
    return fallback();
  }
}

/** @deprecated استخدم loadCatalogProductsFromLocalStorage */
export function loadPublicProductsFromLocalStorage(): Product[] {
  return loadCatalogProductsFromLocalStorage("public");
}

export function notifyProductsStorageChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("gift-catalog-products-changed"));
  } catch {
    //
  }
}
