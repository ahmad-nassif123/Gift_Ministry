import { grandTotalInArabicWords } from "@/lib/arabic-number-words";

/**
 * نص «المبلغ كتابة» للـ PDF.
 * النص المنطقي + خط Noto Naskh + RTL (بدون arabic-persian-reshaper لأنه يكسّر ث آخر «ثلاث»).
 */
export function invoiceAmountInArabicWords(amount: number, currency: "SYP" | "USD"): string {
  return grandTotalInArabicWords(amount, currency);
}
