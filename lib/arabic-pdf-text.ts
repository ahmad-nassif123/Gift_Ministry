import { shapeArabicText } from "naqqash";

/**
 * تشكيل العربية لـ @react-pdf/renderer.
 * react-pdf لا يشكّل العربية تلقائياً — naqqash يحوّل إلى Presentation Forms-B.
 * @see https://github.com/anis-marrouchi/naqqash
 */
export function shapeArabicForReactPdf(logicalText: string): string {
  const t = String(logicalText ?? "").trim();
  if (!t) return "";
  return shapeArabicText(t);
}
