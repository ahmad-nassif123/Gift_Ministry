"use client";

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";

const fontBase =
  typeof window !== "undefined" ? `${window.location.origin}/fonts/tajawal` : "/fonts/tajawal";

Font.register({
  family: "Tajawal",
  fonts: [
    { src: `${fontBase}/ArbFONTS-Tajawal-ExtraLight.ttf`, fontWeight: 200 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Light.ttf`, fontWeight: 300 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Regular.ttf`, fontWeight: 400 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Medium.ttf`, fontWeight: 500 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Bold.ttf`, fontWeight: 700 },
    { src: `${fontBase}/ArbFONTS-Tajawal-ExtraBold.ttf`, fontWeight: 800 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Black.ttf`, fontWeight: 900 },
  ],
});

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

function formatArabicIndicInt(n: number): string {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return v.toLocaleString("ar-SA", { numberingSystem: "arab", useGrouping: true });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    padding: 24,
    direction: "rtl",
    backgroundColor: COLORS.white,
  },
  title: {
    fontFamily: "Tajawal",
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
    fontFamily: "Tajawal",
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
    fontFamily: "Tajawal",
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
    fontFamily: "Tajawal",
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.gray600,
    textAlign: "right",
    marginBottom: 4,
    lineHeight: 1.25,
  },
  summaryStatValue: {
    fontFamily: "Tajawal",
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
    fontFamily: "Tajawal",
    fontSize: 8,
    color: COLORS.gray700,
    textAlign: "right",
    lineHeight: 1.45,
  },
  pageHint: {
    fontFamily: "Tajawal",
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
    fontFamily: "Tajawal",
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
    fontFamily: "Tajawal",
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
    fontFamily: "Tajawal",
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
      <Text style={styles.summaryStatLabel}>{label}</Text>
      <Text style={styles.summaryStatValue}>{value}</Text>
    </View>
  );
}

function TableHead() {
  return (
    <View style={styles.tableHeader} wrap={false}>
      <Text style={[styles.th, styles.thCenter, { width: col.source }]}>المصدر</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.lines }]}>البنود</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.payment }]}>السداد</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.currency }]}>العملة</Text>
      <Text style={[styles.th, { width: col.total }]}>المبلغ</Text>
      <Text style={[styles.th, { width: col.toSir }]}>الجهة</Text>
      <Text style={[styles.th, { width: col.invNo }]}>رقم الفاتورة</Text>
      <Text style={[styles.th, { width: col.date }]}>التاريخ والوقت</Text>
      <Text style={[styles.th, styles.thCenter, { width: col.idx }]}>م</Text>
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

  const fmtUsd = (n: number) =>
    `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  return (
    <Document>
      {chunks.map((pageRows, pageIdx) => (
        <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
          {pageIdx === 0 ? (
            <>
              <Text style={styles.title}>تقرير سجل الفواتير الصادرة</Text>
              <View style={styles.titleUnderline} />
              <Text style={styles.subtitle}>تاريخ إعداد المستند: {generatedAtStr}</Text>
              <View style={styles.summaryWrap}>
                <Text style={styles.summaryTitle}>ملخص مالي — وفق الفواتير الظاهرة في الجدول</Text>
                <View style={styles.summaryRow}>
                  <SummaryStat label="عدد الفواتير" value={formatArabicIndicInt(summary.totalInvoices)} />
                  <SummaryStat
                    label="نقدي / مؤجل (عدد)"
                    value={`${formatArabicIndicInt(summary.nCash)} / ${formatArabicIndicInt(summary.nDeferred)}`}
                  />
                  <SummaryStat
                    label="إجمالي الليرة السورية — نقدي"
                    value={`${formatArabicIndicInt(summary.sypCash)} ل.س`}
                  />
                  <SummaryStat
                    label="إجمالي الليرة السورية — مؤجل"
                    value={`${formatArabicIndicInt(summary.sypDeferred)} ل.س`}
                  />
                </View>
                <View style={styles.summaryRow}>
                  <SummaryStat label="مجموع الليرة السورية" value={`${formatArabicIndicInt(sypAll)} ل.س`} />
                  <SummaryStat label="إجمالي الدولار — نقدي" value={fmtUsd(summary.usdCash)} />
                  <SummaryStat label="إجمالي الدولار — مؤجل" value={fmtUsd(summary.usdDeferred)} />
                  <SummaryStat label="مجموع الدولار الأمريكي" value={fmtUsd(usdAll)} />
                </View>
                <View style={styles.noteWrap}>
                  <Text style={styles.note}>
                    ملاحظة: يُحسب كل صف حسب عملة الفاتورة كما وردت في السجل. لا تُدمج الليرة مع الدولار في صف
                    واحد. الأرقام المعروضة هي نفسها المحفوظة في السجل لحظة إنشاء هذا التقرير.
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.pageHint}>
              تقرير سجل الفواتير — متابعة الجدول — صفحة {formatArabicIndicInt(pageIdx + 1)} من{" "}
              {formatArabicIndicInt(totalPages)}
            </Text>
          )}

          <View style={styles.tableWrap}>
            <TableHead />
            {pageRows.map((r, i) => {
              const globalIdx = pageIdx * ROWS_PER_PAGE + i;
              const even = globalIdx % 2 === 1;
              const truncatedSir = r.toSir.length > 44 ? `${r.toSir.slice(0, 42)}…` : r.toSir;
              const truncatedTotal = r.grandTotalText.length > 30 ? `${r.grandTotalText.slice(0, 28)}…` : r.grandTotalText;
              return (
                <View key={`${r.idx}-${globalIdx}`} style={even ? [styles.tr, styles.trEven] : styles.tr} wrap={false}>
                  <Text style={[styles.td, styles.tdCenter, { width: col.source }]}>{r.sourceLabel}</Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.lines }]}>
                    {formatArabicIndicInt(r.linesCount)}
                  </Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.payment }]}>{r.paymentLabel}</Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.currency }]}>{r.currencyLabel}</Text>
                  <Text style={[styles.td, { width: col.total }]}>{truncatedTotal}</Text>
                  <Text style={[styles.td, { width: col.toSir }]}>{truncatedSir || "—"}</Text>
                  <Text style={[styles.td, { width: col.invNo }]}>{r.invoiceNo || "—"}</Text>
                  <Text style={[styles.td, { width: col.date }]}>{r.createdAtDisplay}</Text>
                  <Text style={[styles.td, styles.tdCenter, { width: col.idx }]}>{formatArabicIndicInt(r.idx)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>سجل الفواتير — إدارة التسعير</Text>
            <Text style={styles.footerText}>
              صفحة {formatArabicIndicInt(pageIdx + 1)} من {formatArabicIndicInt(totalPages)}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
