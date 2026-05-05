/**
 * عرض أسعار الهدايا بالدولار للزائر: يُفسَّر السعر المخزّن بليرة (مثل «60 ل.س») ويُحوَّل بسعر ثابت.
 * يمكن ضبط السعر عبر NEXT_PUBLIC_CATALOG_SYP_PER_USD (كم ليرة للدولار الواحد)، الافتراضي 15000.
 */

function getSypPerUsd(): number {
  const n = Number(process.env.NEXT_PUBLIC_CATALOG_SYP_PER_USD ?? 15000);
  if (!Number.isFinite(n) || n <= 0) return 15000;
  return n;
}

function toLatinDigits(s: string): string {
  return s.replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660));
}

/** يستخرج قيمة ليرة صحيحة من نص سعر شائع في الكتالوج. */
export function parseSypIntegerFromPriceLabel(raw: string): number | null {
  const s = toLatinDigits(String(raw ?? "").trim())
    .replace(/ل\.س|ر\.س|SYP|syp/gi, " ")
    .replace(/,/g, "");
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatUsdAmount(usd: number): string {
  if (!Number.isFinite(usd) || usd < 0) return "—";
  if (usd >= 0.01) return `${usd.toFixed(2)} USD`;
  return `${usd.toFixed(4)} USD`;
}

/**
 * يعرض السعر للزائر بالدولار إن بدا كسعر ليرة؛ وإلا يعيد النص كما هو (مثل «حسب الطلب» أو سعر مكتوب بالدولار).
 */
export function formatGiftPriceUsdLabel(raw?: string | null): string {
  if (raw == null) return "—";
  const t = String(raw).trim();
  if (!t) return "—";
  if (/حسب الطلب/i.test(t)) return t;
  if (/\bUSD\b|\$/i.test(t)) return t;

  const syp = parseSypIntegerFromPriceLabel(t);
  if (syp == null) return t;

  const rate = getSypPerUsd();
  const usd = syp / rate;
  return formatUsdAmount(usd);
}
