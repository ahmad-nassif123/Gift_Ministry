import type { Product } from "@/data/products";

/** إزالة حقول التسعير قبل إرسال المنتج للكتالوج العام. */
export function stripProductPricesForPublic(product: Product): Product {
  const { price: _p, salePrice: _s, pricingDetail: _d, ...rest } = product;
  return rest;
}

export function stripProductsPricesForPublic(products: Product[]): Product[] {
  return products.map(stripProductPricesForPublic);
}
