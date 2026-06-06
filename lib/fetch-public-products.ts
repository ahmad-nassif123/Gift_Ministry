import type { Product } from "@/data/products";
import type { CatalogScope } from "@/lib/catalog-scope";

/** جلب قائمة الكتالوج دون كاش المتصفح/CDN. */
export async function fetchCatalogProducts(scope: CatalogScope = "public"): Promise<Product[] | null> {
  try {
    const res = await fetch(`/api/products?scope=${scope}&_=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
    });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (json.success && Array.isArray(json.data)) {
      return json.data as Product[];
    }
  } catch {
    //
  }
  return null;
}

/** @deprecated استخدم fetchCatalogProducts */
export async function fetchPublicCatalogProducts(): Promise<Product[] | null> {
  return fetchCatalogProducts("public");
}
