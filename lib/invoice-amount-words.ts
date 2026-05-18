import { grandTotalInArabicWords } from "@/lib/arabic-number-words";
import { shapeArabicForPdf } from "@/lib/arabic-pdf-text";

/** نص «المبلغ كتابة» جاهز للطباعة في PDF. */
export function invoiceAmountInArabicWords(amount: number, currency: "SYP" | "USD"): string {
  return shapeArabicForPdf(grandTotalInArabicWords(amount, currency));
}
