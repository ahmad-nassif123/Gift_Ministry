import { ArabicShaper } from "arabic-persian-reshaper";

/** تشكيل النص العربي لـ react-pdf (عرض بصيغ Unicode Presentation). */
export function shapeArabicForPdf(logicalText: string): string {
  const t = String(logicalText ?? "").trim();
  if (!t) return "";
  try {
    return ArabicShaper.convertArabic(t);
  } catch {
    return t;
  }
}
