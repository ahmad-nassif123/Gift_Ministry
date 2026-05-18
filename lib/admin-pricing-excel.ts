import type { Product } from "@/data/products";
import type { WorkSheet } from "xlsx";

/** ترتيب أعمدة ملف التصدير/الاستيراد (بدون slug). */
export const PRICING_EXCEL_HEADERS = [
  "التسلسل",
  "اسم الهدية",
  "SKU",
  "سعر المبيع",
  "السعر",
  "التفصيل",
] as const;

export type PricingExcelExportRow = {
  التسلسل: number;
  "اسم الهدية": string;
  SKU: string;
  "سعر المبيع": string;
  السعر: string;
  التفصيل: string;
};

function skuSortKey(sku: string | undefined): number {
  const s = (sku ?? "").trim();
  const m = s.match(/(\d+)/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

export function buildPricingExcelExportRows(
  products: Product[],
  drafts: {
    price: Record<string, string>;
    salePrice: Record<string, string>;
    detail: Record<string, string>;
  }
): PricingExcelExportRow[] {
  return [...products]
    .filter((p) => !p.archived)
    .sort((a, b) => {
      const ak = skuSortKey(a.sku);
      const bk = skuSortKey(b.sku);
      if (ak !== bk) return ak - bk;
      return (a.sku ?? "").localeCompare(b.sku ?? "", "en") || a.name.localeCompare(b.name, "ar");
    })
    .map((p, i) => ({
      التسلسل: i + 1,
      "اسم الهدية": p.name,
      SKU: p.sku ?? "",
      "سعر المبيع": String(drafts.salePrice[p.slug] ?? p.salePrice ?? "").trim(),
      السعر: String(drafts.price[p.slug] ?? p.price ?? "").trim(),
      التفصيل: String(drafts.detail[p.slug] ?? p.pricingDetail ?? "").trim(),
    }));
}

/** عرض أعمدة، تجميد الصف الأول، وفلتر تلقائي. */
/** تحويل خلية SKU من Excel إلى نص كما يُفترض إدخاله (بدون تغيير حالة الأحرف). */
export function normalizeExcelSkuCell(raw: unknown): string {
  if (raw === "" || raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (Number.isInteger(raw)) return String(raw);
    return String(raw);
  }
  return String(raw)
    .trim()
    .replace(/[\u0660-\u0669]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x0660 + 48));
}

/** خريطة SKU → slug للمطابقة الحرفية بعد trim (لا slug ولا تجاهل لحالة الأحرف). */
export function buildProductSlugByExactSku(products: Product[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of products) {
    const sku = normalizeExcelSkuCell(p.sku);
    if (!sku || map.has(sku)) continue;
    map.set(sku, p.slug);
  }
  return map;
}

function normalizePricingExcelHeaderKey(key: string): string {
  return key.trim().replace(/\s+/g, "").toLowerCase();
}

/** قراءة عمود بمطابقة الاسم بعد إزالة المسافات (مثل « السعر » في ملفات Excel). */
export function getPricingExcelColumnValue(
  row: Record<string, unknown>,
  ...headerAliases: string[]
): unknown {
  const want = new Set(headerAliases.map((a) => normalizePricingExcelHeaderKey(a)));
  for (const [key, value] of Object.entries(row)) {
    if (want.has(normalizePricingExcelHeaderKey(key))) return value;
  }
  return "";
}

/** استخراج SKU من صف Excel (عمود SKU أو مرادفات شائعة). */
export function extractSkuFromPricingExcelRow(row: Record<string, unknown>): string {
  for (const [key, value] of Object.entries(row)) {
    const kn = key.trim().replace(/\s+/g, "").toLowerCase();
    if (kn === "sku" || kn === "كود" || kn === "كودالهدية" || kn === "رمزالمادة") {
      return normalizeExcelSkuCell(value);
    }
  }
  return normalizeExcelSkuCell(row.SKU ?? row.sku ?? row["SKU"] ?? row["sku"] ?? "");
}

export function formatPricingExcelWorksheet(ws: WorkSheet, dataRowCount: number): void {
  ws["!cols"] = [
    { wch: 8 },
    { wch: 38 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
  ];
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };
  if (dataRowCount > 0) {
    const lastRow = dataRowCount + 1;
    ws["!autofilter"] = { ref: `A1:F${lastRow}` };
  }
}
