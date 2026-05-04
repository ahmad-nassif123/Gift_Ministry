import type { Product } from "@/data/products";
import type { AdminPricingInvoiceLineSnapshot } from "@/lib/admin-pricing-invoices-db";

/** استخراج عدد صحيح تقريبي من نص سعر قد يحتوي أرقام عربية أو لاتينية */
export function parseRoughIntegerFromPriceText(raw: string): number {
  const s = String(raw ?? "").replace(/\s+/g, "");
  const latin = s.replace(/[^\d]/g, "");
  if (latin) {
    const n = Number(latin);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  const arToLat = s.replace(/[\u0660-\u0669]/g, (ch) =>
    String("0123456789"[ch.charCodeAt(0) - 0x0660])
  );
  const digits = arToLat.replace(/[^\d]/g, "");
  const n2 = Number(digits);
  return Number.isFinite(n2) && n2 >= 0 ? Math.floor(n2) : 0;
}

export type SnapshotQuoteSeed =
  | { kind: "product"; slug: string; qty: number }
  | { kind: "custom"; name: string; unitPriceInput: string; qty: number };

/** تحويل بنود الفاتورة المخزّنة إلى مدخلات الحاسبة (مطابقة SKU أو بند يدوي). */
export function snapshotSeedsToQuote(
  lines: AdminPricingInvoiceLineSnapshot[],
  products: Product[]
): SnapshotQuoteSeed[] {
  const bySku = new Map(products.map((p) => [p.sku.trim().toUpperCase(), p] as const));
  const out: SnapshotQuoteSeed[] = [];

  for (const ln of lines) {
    const qty = Math.max(0, Math.min(999999, Math.floor(Number(ln.qty) || 0)));
    let unitInput = "";
    if (ln.unitSyp != null && Number.isFinite(ln.unitSyp) && ln.unitSyp >= 0) {
      unitInput = String(Math.floor(ln.unitSyp));
    } else {
      unitInput = String(parseRoughIntegerFromPriceText(ln.unitPriceText) || 0);
    }

    if (ln.custom) {
      out.push({ kind: "custom", name: ln.name.trim() || "بند يدوي", unitPriceInput: unitInput || "0", qty: qty || 1 });
      continue;
    }

    const skuKey = (ln.sku || "").trim().toUpperCase();
    const p = skuKey && skuKey !== "—" ? bySku.get(skuKey) : undefined;
    if (p) {
      out.push({ kind: "product", slug: p.slug, qty: qty || 1 });
    } else {
      out.push({ kind: "custom", name: ln.name.trim() || "بند", unitPriceInput: unitInput || "0", qty: qty || 1 });
    }
  }

  return out;
}
