/**
 * أسعار الكتالوج بالدولار الأمريكي (USD).
 * يُفسَّر النص المخزَّن كقيمة USD: صريحة بـ USD/$، أو رقم عشري بلا عملة، أو تراث «ل.س» / SYP عند الحاجة للتحويل.
 * «ر.س» تُزال كنص عملة ويُفسَّر الرقم كدولار (لا تُعامل كليرة).
 * سعر التحويل للتراث (ل.س فقط): NEXT_PUBLIC_CATALOG_SYP_PER_USD (افتراضي 15000 ل.س للدولار).
 */

function getSypPerUsd(): number {
  const n = Number(process.env.NEXT_PUBLIC_CATALOG_SYP_PER_USD ?? 15000);
  if (!Number.isFinite(n) || n <= 0) return 15000;
  return n;
}

function toLatinDigits(s: string): string {
  return s.replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660));
}

/** يستخرج قيمة ليرة صحيحة من نص سعر قديم (ل.س أو SYP فقط). */
export function parseSypIntegerFromPriceLabel(raw: string): number | null {
  const s = toLatinDigits(String(raw ?? "").trim())
    .replace(/ل\.س|\bSYP\b|syp/gi, " ")
    .replace(/,/g, "");
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function roundCatalogUsd(usd: number): number {
  if (!Number.isFinite(usd)) return 0;
  return Math.round(usd * 100) / 100;
}

function formatUsdAmount(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "";
  const digits = usd >= 0.01 ? 2 : 4;
  return usd.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * يستخرج مبلغ الدولار من نص السعر: USD صريح، رقم بلا عملة، أو ل.س/SYP (تراث)، أو رقم بعد إزالة «ر.س».
 */
export function parseGiftPriceUsdAmount(raw: string): number {
  const t = toLatinDigits(String(raw ?? "").trim());
  if (!t) return 0;
  if (/حسب الطلب/i.test(t)) return 0;
  const lower = t.toLowerCase();
  const hasSypMarker = /ل\.س|\bsyp\b/i.test(lower);
  if (hasSypMarker) {
    const syp = parseSypIntegerFromPriceLabel(t);
    if (syp == null || syp <= 0) return 0;
    return syp / getSypPerUsd();
  }
  const usdPortion = t
    .replace(/\busd\b|\$/gi, "")
    .replace(/ر\.س/gi, "")
    .replace(/\s+/g, "")
    .replace(/,/g, "");
  const n = Number(usdPortion);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * عرض السعر للزائر (رقم فقط، بدون رمز عملة)؛ النصوص الخاصة (مثل «حسب الطلب») كما هي.
 */
export function formatGiftPriceUsdLabel(raw?: string | null): string {
  if (raw == null) return "—";
  const t = String(raw).trim();
  if (!t) return "—";
  if (/حسب الطلب/i.test(t)) return t;
  const usd = parseGiftPriceUsdAmount(t);
  if (usd > 0) return formatUsdAmount(usd);
  return t.replace(/\s*\bUSD\b\s*|\$/gi, "").trim() || t;
}

/** للعرض العام: سعر المبيع إن وُجد، وإلا السعر الأساسي. */
export function formatCustomerFacingPrice(product: { price?: string; salePrice?: string }): string {
  const raw = (product.salePrice && String(product.salePrice).trim()) || (product.price && String(product.price).trim()) || "";
  return formatGiftPriceUsdLabel(raw || null);
}
