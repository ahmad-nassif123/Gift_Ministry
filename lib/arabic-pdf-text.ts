import reshaper from "arabic-persian-reshaper";

type ArabicReshaperModule = {
  ArabicShaper: { convertArabic: (text: string) => string };
};

const { ArabicShaper } = reshaper as unknown as ArabicReshaperModule;

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
