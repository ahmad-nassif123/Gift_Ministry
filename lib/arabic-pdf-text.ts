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

const HAS_ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** يشكّل النص إن وُجدت أحرف عربية؛ يمرّر الأرقام/اللاتينية كما هي. */
export function pdfAr(text: string): string {
  const t = String(text ?? "");
  if (!t.trim() || !HAS_ARABIC.test(t)) return t;
  return shapeArabicForReactPdf(t);
}
