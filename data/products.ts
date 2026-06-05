export type GiftTier = "standard" | "premium" | "luxury";

export interface Product {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  contents: string[];
  price?: string;
  /** سعر البيع للعميل (يظهر في الكتالوج إن وُجد؛ وإلا يُعرض `price`). */
  salePrice?: string;
  /** ملاحظة تسعير داخلية (مثلاً تفصيل من Excel) — تُعرض في الإدارة فقط. */
  pricingDetail?: string;
  category?: string;
  giftTier: GiftTier; // تصنيف الهدية: قياسية، مميزة، فاخرة
  images: string[];
  /** صورة كتالوج للطباعة (HD) — رابط مباشر للصورة */
  catalogImage?: string;
  availableQuantity?: number; // الكمية المتوفرة
  archived?: boolean; // يُضبط عبر التحديث (PUT)؛ زر الحذف في الداشبورد يزيل الصف من القاعدة
  hidden?: boolean; // إخفاء عن الموقع الرسمي (يبقى في الداشبورد)
  /** true = تظهر في صفحة الهدايا الخاصة فقط؛ false = تظهر في الصفحة العامة */
  isPrivate?: boolean;
  createdAt?: string; // من قاعدة البيانات (اختياري)
  updatedAt?: string; // من قاعدة البيانات (اختياري)
}

/** منتجات تعتمد صور مجلد public/archive-images (أرشيف التصوير) */
export function isArchiveCatalogProduct(product: Product): boolean {
  return (product.images ?? []).some(
    (src) => typeof src === "string" && src.includes("/archive-images/")
  );
}

export const products: Product[] = [];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku || p.sku.toUpperCase() === sku.toUpperCase());
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((product) => product.category === category);
}

export function getAllCategories(): string[] {
  const categories = products
    .map((product) => product.category)
    .filter((cat): cat is string => cat !== undefined);
  return Array.from(new Set(categories));
}

export function getAllGiftTiers(): GiftTier[] {
  return ["standard", "premium", "luxury"];
}

export function getGiftTierLabel(tier: GiftTier): string {
  const labels: Record<GiftTier, string> = {
    standard: "قياسية",
    premium: "مميزة",
    luxury: "فاخرة",
  };
  return labels[tier];
}

export function getProductsByGiftTier(tier: GiftTier): Product[] {
  return products.filter((product) => product.giftTier === tier);
}

// توليد SKU تلقائياً
export function generateNextSKU(): string {
  const skuNumbers = products
    .map((p) => {
      const match = p.sku.match(/G(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0);

  const maxNumber = skuNumbers.length > 0 ? Math.max(...skuNumbers) : 0;
  const nextNumber = maxNumber + 1;

  return `G${nextNumber.toString().padStart(2, "0")}`;
}
