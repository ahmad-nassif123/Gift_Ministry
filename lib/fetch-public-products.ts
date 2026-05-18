import type { Product } from "@/data/products";

/** جلب قائمة الكتالوج العام دون كاش المتصفح/CDN. */
export async function fetchPublicCatalogProducts(): Promise<Product[] | null> {
  try {
    const res = await fetch(`/api/products?_=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
    });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data as Product[];
    }
  } catch {
    //
  }
  return null;
}
