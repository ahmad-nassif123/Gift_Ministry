"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfAr } from "@/lib/arabic-pdf-text";
import { formatWesternGroupedInteger, formatWesternUsdAmount } from "@/lib/format-western-number";
import { ensurePdfFontsRegistered, PDF_FONT, pdfArabicTextStyle } from "@/lib/pdf-fonts";

ensurePdfFontsRegistered();

const COLORS = {
  primary: "#0b443a",
  white: "#ffffff",
  gray50: "#f4f7f6",
  gray100: "#eef2f0",
  gray200: "#d1ddd8",
  gray600: "#4b5563",
  gray700: "#374151",
  borderAccent: "#0b443a",
};

function parseLooseNumber(raw: string): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatCurrencyTextForLog(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return "—";
  const isUsd = /\bUSD\b|\$|دولار/i.test(t);
  const isLegacySyp = /ل\.س|\bSYP\b/i.test(t);
  const isRiyalLabel = /ر\.س/i.test(t);
  const n = parseLooseNumber(t);

  if ((isUsd || isRiyalLabel) && n != null) return `${formatWesternUsdAmount(n)} USD`;
  if (isLegacySyp && n != null) return `${formatWesternGroupedInteger(n)} ل.س`;
  if (n != null) return `${formatWesternUsdAmount(n)} USD`;

  return pdfAr(
    t
      .replace(/\bUSD\b/gi, "USD")
      .replace(/ر\.س/gi, "USD")
      .replace(/\bSYP\b/gi, "ل.س")
      .replace(/ل\.س/gi, "ل.س")
  );
}

function normalizeArDateTimeLabel(s: string): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "—";
  return raw
    .replace(/[،,]\s*/g, " — ")
    .replace(/\s{2,}/g, " ")
    .replace(/—\s*—/g, "—")
    .trim();
}

const arBase = pdfArabicTextStyle;

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT.amiri,
    padding: 24,
    backgroundColor: COLORS.white,
  },
  title: {
    ...arBase,
    fontSize: 17,
    fontWeight: 900,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  titleUnderline: {
    height: 3,
    backgroundColor: COLORS.primary,
    marginBottom: 8,
    borderRadius: 1,
  },
  subtitle: {
    ...arBase,
    fontSize: 9.5,
    color: COLORS.gray600,
    textAlign: "center",
    marginBottom: 14,
  },
  summaryWrap: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRightWidth: 4,
    borderRightColor: COLORS.borderAccent,
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
    backgroundColor: COLORS.gray50,
  },
  summaryTitle: {
    ...arBase,
    fontSize: 11,
    fontWeight: 800,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    width: "100%",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  summaryStat: {
    width: "24%",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "flex-end",
  },
  summaryStatLabel: {
    ...arBase,
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.gray600,
    textAlign: "right",
    marginBottom: 4,
    lineHeight: 1.25,
  },
  summaryStatValue: {
    ...arBase,
    fontSize: 9,
    fontWeight: 800,
    color: COLORS.primary,
    textAlign: "right",
  },
  noteWrap: {
    marginTop: 10,
    padding: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  note: {
    ...arBase,
    fontSize: 8,
    color: COLORS.gray700,
    textAlign: "right",
    lineHeight: 1.45,
  },
  pageHint: {
    ...arBase,
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  tableWrap: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  th: {
    ...arBase,
    fontSize: 7.5,
    fontWeight: 800,
    color: COLORS.white,
    textAlign: "right",
    paddingHorizontal: 3,
  },
  thCenter: {
    textAlign: "center",
  },
  tr: {
    flexDirection: "row-reverse",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    alignItems: "center",
    minHeight: 28,
  },
  trEven: {
    backgroundColor: COLORS.gray50,
  },
  td: {
    ...arBase,
    fontSize: 7,
    color: COLORS.gray700,
    textAlign: "right",
    paddingHorizontal: 3,
  },
  tdCenter: {
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: 8,
  },
  footerText: {
    ...arBase,
    fontSize: 7.5,
    color: COLORS.gray600,
  },
});

const col = {
  idx: "4%",
  date: "13%",
  invNo: "11%",
  toSir: "17%",
  total: "14%",
  currency: "8%",
  payment: "8%",
  lines: "7%",
  source: "8%",
};

export type InvoiceLogReportPdfRow = {
  idx: number;
  createdAtDisplay: string;
  invoiceNo: string;
  toSir: string;
  grandTotalText: string;
  currencyLabel: string;
  paymentLabel: string;
  linesCount: number;
  sourceLabel: string;
};

export type InvoiceLogReportPdfSummary = {
  totalInvoices: number;
  sypCash: number;
  sypDeferred: number;
  usdCash: number;
  usdDeferred: number;
  nCash: number;
  nDeferred: number;
};

const ROWS_PER_PAGE = 15;

function chunkRows<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatLabel}>{pdfAr(label)}</Text>
      <Text style={styles.summaryStatValue}>{pdfAr(value)}</Text>
    </View>
  );
}

function TableHead() {
  return (
    <View style={styles.tableHeader} wrap={false}>
      <Text style={[styles.th, styles.thCenter, { width: col.source }]}>{pdfAr("المصدر")}</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.lines }]}>{pdfAr("البنود")}</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.payment }]}>{pdfAr("السداد")}</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.currency }]}>{pdfAr("العملة")}</Text>
      <Text style={[styles.th, { width: col.total }]}>{pdfAr("المبلغ")}</Text>
      <Text style={[styles.th, { width: col.toSir }]}>{pdfAr("الجهة")}</Text>
      <Text style={[styles.th, { width: col.invNo }]}>{pdfAr("رقم الفاتورة")}</Text>
      <Text style={[styles.th, { width: col.date }]}>{pdfAr("التاريخ والوقت")}</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.idx }]}>{pdfAr("م")}</Text>
    </View>
  );
}

export function InvoiceLogReportPDF({
  generatedAtStr,
  rows,
  summary,
}: {
  generatedAtStr: string;
  rows: InvoiceLogReportPdfRow[];
  summary: InvoiceLogReportPdfSummary;
}) {
  const chunks = chunkRows(rows, ROWS_PER_PAGE);
  const totalPages = Math.max(1, chunks.length);
  const sypAll = summary.sypCash + summary.sypDeferred;
  const usdAll = summary.usdCash + summary.usdDeferred;

  const fmtUsd = (n: number) => pdfAr(`${formatWesternUsdAmount(n)} USD`);
  const fmtArchive = (n: number) => pdfAr(`${formatWesternGroupedInteger(n)} ل.س`);

  return (
    <Document>
      {chunks.map((pageRows, pageIdx) => (
        <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
          {pageIdx === 0 ? (
            <>
              <Text style={styles.title}>{pdfAr("تقرير سجل الفواتير الصادرة")}</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.subtitle}>
                {pdfAr(`تاريخ إعداد التقرير (${normalizeArDateTimeLabel(generatedAtStr)})`)}
              </Text>
              <View style={styles.summaryWrap}>
                <Text style={styles.summaryTitle}>{pdfAr("ملخص مالي — وفق الفواتير الظاهرة في الجدول")}</Text>
                <View style={styles.summaryRow}>
                  <SummaryStat
                    label="عدد الفواتير"
                    value={formatWesternGroupedInteger(summary.totalInvoices)}
                  />
                  <SummaryStat
                    label="نقدي / مؤجل (عدد)"
                    value={`${formatWesternGroupedInteger(summary.nCash)} / ${formatWesternGroupedInteger(summary.nDeferred)}`}
                  />
                  <SummaryStat label="فواتير ل.س — نقدي" value={fmtArchive(summary.sypCash)} />
                  <SummaryStat label="فواتير ل.س — مؤجل" value={fmtArchive(summary.sypDeferred)} />
                </View>
                <View style={styles.summaryRow}>
                  <SummaryStat label="مجموع فواتير ل.س" value={fmtArchive(sypAll)} />
                  <SummaryStat label="إجمالي USD — نقدي" value={fmtUsd(summary.usdCash)} />
                  <SummaryStat label="إجمالي USD — مؤجل" value={fmtUsd(summary.usdDeferred)} />
                  <SummaryStat label="مجموع USD" value={fmtUsd(usdAll)} />
                </View>
                <View style={styles.noteWrap}>
                  <Text style={styles.note}>
                    {pdfAr(
                      "ملاحظة: الفواتير الجديدة بالدولار الأمريكي (USD). صفوف ل.س للسجلات القديمة. الأرقام بصيغة 1,234.56."
                    )}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.pageHint}>
              {pdfAr(
                `تقرير سجل الفواتير — متابعة الجدول — صفحة ${formatWesternGroupedInteger(pageIdx + 1)} من ${formatWesternGroupedInteger(totalPages)}`
              )}
            </Text>
          )}

          <View style={styles.tableWrap}>
            <TableHead />
            {pageRows.map((r, i) => {
              const globalIdx = pageIdx * ROWS_PER_PAGE + i;
              const even = globalIdx % 2 === 1;
              const truncatedSir = r.toSir.length > 44 ? `${r.toSir.slice(0, 42)}…` : r.toSir;
              const prettyTotal = formatCurrencyTextForLog(r.grandTotalText);
              const truncatedTotal = prettyTotal.length > 30 ? `${prettyTotal.slice(0, 28)}…` : prettyTotal;
              const currencyCell = r.currencyLabel === "USD" ? "USD" : pdfAr("ل.س");
              return (
                <View key={`${r.idx}-${globalIdx}`} style={even ? [styles.tr, styles.trEven] : styles.tr} wrap={false}>
                  <Text style={[styles.td, styles.tdCenter, { width: col.source }]}>{pdfAr(r.sourceLabel)}</Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.lines }]}>
                    {formatWesternGroupedInteger(r.linesCount)}
                  </Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.payment }]}>{pdfAr(r.paymentLabel)}</Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.currency }]}>{currencyCell}</Text>
                  <Text style={[styles.td, { width: col.total }]}>{truncatedTotal}</Text>
                  <Text style={[styles.td, { width: col.toSir }]}>{pdfAr(truncatedSir || "—")}</Text>
                  <Text style={[styles.td, { width: col.invNo }]}>{r.invoiceNo || "—"}</Text>
                  <Text style={[styles.td, { width: col.date }]}>{r.createdAtDisplay}</Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.idx }]}>
                    {formatWesternGroupedInteger(r.idx)}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{pdfAr("سجل الفواتير — إدارة التسعير")}</Text>
            <Text style={styles.footerText}>
              {pdfAr(
                `صفحة ${formatWesternGroupedInteger(pageIdx + 1)} من ${formatWesternGroupedInteger(totalPages)}`
              )}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
