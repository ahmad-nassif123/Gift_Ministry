import { pdf } from "@react-pdf/renderer";
import { AdminQuotePDF, type AdminQuoteLine, type AdminQuotePdfMeta } from "@/components/pdf/admin-quote-pdf";

export type { AdminQuoteLine, AdminQuotePdfMeta };

export async function generateAdminQuoteBlob(input: {
  meta: AdminQuotePdfMeta;
  lines: AdminQuoteLine[];
  grandTotalText: string;
  grandNumericForWords: number;
  currency: "SYP" | "USD";
}): Promise<Blob> {
  const doc = (
    <AdminQuotePDF
      meta={input.meta}
      lines={input.lines}
      grandTotalText={input.grandTotalText}
      grandNumericForWords={input.grandNumericForWords}
      currency={input.currency}
    />
  );
  return pdf(doc).toBlob();
}
