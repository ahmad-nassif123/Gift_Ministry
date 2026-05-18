/** Converts a non‑negative integer (0 … ~10¹²) to cardinal words in Arabic (masculine). */

const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

const teens = [
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];

function joinParts(parts: string[]): string {
  const p = parts.filter(Boolean);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0];
  return p.join(" و ");
}

function belowHundred(n: number): string {
  if (n === 0) return "";
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (o === 0) return tens[t];
  return `${ones[o]} و${tens[t]}`;
}

function belowThousand(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hPart = hundreds[h] || "";
  const rPart = belowHundred(rest);
  if (!hPart) return rPart;
  if (!rPart) return hPart;
  return `${hPart} و${rPart}`;
}

function formatThousandsGroup(n: number): string {
  if (n === 0) return "";
  if (n === 1) return "ألف";
  if (n === 2) return "ألفان";
  if (n >= 3 && n <= 10) return `${belowThousand(n)} آلاف`;
  return `${belowThousand(n)} ألفاً`;
}

function formatMillionsGroup(n: number): string {
  if (n === 0) return "";
  if (n === 1) return "مليون";
  if (n === 2) return "مليونان";
  if (n >= 3 && n <= 10) return `${belowThousand(n)} ملايين`;
  return `${belowThousand(n)} مليوناً`;
}

function formatBillionsGroup(n: number): string {
  if (n === 0) return "";
  if (n === 1) return "مليار";
  if (n === 2) return "ملياران";
  if (n >= 3 && n <= 10) return `${belowThousand(n)} مليارات`;
  return `${belowThousand(n)} ملياراً`;
}

export function integerToArabicWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0) return "صفر";

  let x = Math.floor(n);
  const parts: string[] = [];

  const b = Math.floor(x / 1_000_000_000);
  if (b > 0) {
    parts.push(formatBillionsGroup(b));
    x %= 1_000_000_000;
  }

  const m = Math.floor(x / 1_000_000);
  if (m > 0) {
    parts.push(formatMillionsGroup(m));
    x %= 1_000_000;
  }

  const th = Math.floor(x / 1000);
  if (th > 0) {
    parts.push(formatThousandsGroup(th));
    x %= 1000;
  }

  if (x > 0) {
    parts.push(belowThousand(x));
  }

  return joinParts(parts);
}

export function grandTotalInArabicWords(amount: number, currency: "SYP" | "USD"): string {
  if (!Number.isFinite(amount) || amount < 0) return "";

  if (currency === "SYP") {
    const whole = Math.floor(amount + 1e-9);
    const w = integerToArabicWords(whole);
    return `${w} ليرة سورية جديدة`;
  }

  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const w = integerToArabicWords(whole);
  let s = `${w} دولاراً أمريكياً`;
  if (cents > 0) {
    s += ` و${integerToArabicWords(cents)} سنتاً`;
  }
  return s;
}
