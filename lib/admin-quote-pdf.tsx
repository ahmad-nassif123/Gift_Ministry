import { pdf } from "@react-pdf/renderer";
import { AdminQuotePDF, type AdminQuoteLine } from "@/components/pdf/admin-quote-pdf";

export async function generateAdminQuoteBlob(input: {
  title?: string;
  subtitle?: string;
  lines: AdminQuoteLine[];
  grandTotalText: string;
}): Promise<Blob> {
  const dateStr = new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const doc = (
    <AdminQuotePDF
      title={input.title}
      subtitle={input.subtitle}
      dateStr={dateStr}
      lines={input.lines}
      grandTotalText={input.grandTotalText}
    />
  );
  return pdf(doc).toBlob();
}

