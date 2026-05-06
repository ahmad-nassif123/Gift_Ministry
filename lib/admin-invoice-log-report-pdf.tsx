import { pdf } from "@react-pdf/renderer";
import {
  InvoiceLogReportPDF,
  type InvoiceLogReportPdfRow,
  type InvoiceLogReportPdfSummary,
} from "@/components/pdf/admin-invoice-log-report-pdf";

export type { InvoiceLogReportPdfRow, InvoiceLogReportPdfSummary };

export type InvoiceLogReportSource = {
  createdAt: string;
  invoiceNo: string;
  toSir: string;
  grandTotalText: string;
  grandNumeric: number;
  currency: "SYP" | "USD";
  paymentTerms: "cash" | "deferred";
  linesCount: number;
  fromDb: boolean;
};

function formatDateTimeAr(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const date = d.toLocaleDateString("ar-SY", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString("ar-SY", {
      hour: "2-digit",
      minute: "2-digit",
    });
    // تجنّب الفاصلة العربية "،" التي قد تربك RTL في PDF
    return `${date} — ${time}`;
  } catch {
    return iso;
  }
}

export function computeInvoiceLogSummary(list: InvoiceLogReportSource[]): InvoiceLogReportPdfSummary {
  let sypCash = 0;
  let sypDeferred = 0;
  let usdCash = 0;
  let usdDeferred = 0;
  let nCash = 0;
  let nDeferred = 0;
  for (const inv of list) {
    const g = inv.grandNumeric;
    if (inv.paymentTerms === "deferred") nDeferred += 1;
    else nCash += 1;
    if (inv.currency === "SYP") {
      if (inv.paymentTerms === "deferred") sypDeferred += Math.floor(Number.isFinite(g) ? g : 0);
      else sypCash += Math.floor(Number.isFinite(g) ? g : 0);
    } else {
      if (inv.paymentTerms === "deferred") usdDeferred += Number.isFinite(g) ? g : 0;
      else usdCash += Number.isFinite(g) ? g : 0;
    }
  }
  return {
    totalInvoices: list.length,
    sypCash,
    sypDeferred,
    usdCash,
    usdDeferred,
    nCash,
    nDeferred,
  };
}

export function mapSourcesToPdfRows(list: InvoiceLogReportSource[]): InvoiceLogReportPdfRow[] {
  return list.map((inv, i) => {
    const createdAtDisplay = formatDateTimeAr(inv.createdAt);
    return {
      idx: i + 1,
      createdAtDisplay,
      invoiceNo: inv.invoiceNo.trim(),
      toSir: inv.toSir.trim(),
      grandTotalText: inv.grandTotalText.trim(),
      currencyLabel: inv.currency === "USD" ? "دولار" : "ل.س",
      paymentLabel: inv.paymentTerms === "deferred" ? "مؤجل" : "نقدي",
      linesCount: Math.max(0, Math.floor(inv.linesCount)),
      sourceLabel: inv.fromDb ? "قاعدة" : "محلي",
    };
  });
}

export async function generateInvoiceLogReportBlob(input: {
  generatedAtStr: string;
  rows: InvoiceLogReportPdfRow[];
  summary: InvoiceLogReportPdfSummary;
}): Promise<Blob> {
  const doc = (
    <InvoiceLogReportPDF generatedAtStr={input.generatedAtStr} rows={input.rows} summary={input.summary} />
  );
  return pdf(doc).toBlob();
}
