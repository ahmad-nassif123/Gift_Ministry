import { grandTotalInArabicWords } from "@/lib/arabic-number-words";
import { shapeArabicForReactPdf } from "@/lib/arabic-pdf-text";

/** نص «المبلغ كتابة» جاهز لـ react-pdf (منطقي → تشكيل naqqash). */
export function invoiceAmountInArabicWords(amount: number, currency: "SYP" | "USD"): string {
  return shapeArabicForReactPdf(grandTotalInArabicWords(amount, currency));
}
