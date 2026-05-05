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
  gray50: "#f8faf9",
  gray200: "#e5e7eb",
  gray700: "#374151",
};

function formatArabicIndicInt(n: number): string {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return v.toLocaleString("ar-SA", { numberingSystem: "arab", useGrouping: true });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    padding: 22,
    direction: "rtl",
    backgroundColor: COLORS.white,
  },
  title: {
    fontFamily: "Tajawal",
    fontSize: 16,
    fontWeight: 900,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  subtitle: {
    fontFamily: "Tajawal",
    fontSize: 9,
    color: COLORS.gray700,
    textAlign: "center",
    marginBottom: 10,
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
    backgroundColor: COLORS.gray50,
  },
  summaryTitle: {
    fontFamily: "Tajawal",
    fontSize: 10,
    fontWeight: 800,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 6,
  },
  summaryGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryCell: {
    width: "48%",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  summaryLabel: {
    fontFamily: "Tajawal",
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.gray700,
    textAlign: "right",
    flex: 1,
  },
  summaryValue: {
    fontFamily: "Tajawal",
    fontSize: 8,
    color: COLORS.primary,
    textAlign: "left",
    fontWeight: 700,
  },
  note: {
    fontFamily: "Tajawal",
    fontSize: 7,
    color: COLORS.gray700,
    textAlign: "right",
    marginTop: 8,
    lineHeight: 1.35,
  },
  pageHint: {
    fontFamily: "Tajawal",
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  th: {
    fontFamily: "Tajawal",
    fontSize: 7,
    fontWeight: 800,
    color: COLORS.white,
    textAlign: "center",
  },
  tr: {
    flexDirection: "row-reverse",
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    alignItems: "stretch",
    minHeight: 26,
  },
  trEven: {
    backgroundColor: COLORS.gray50,
  },
  td: {
    fontFamily: "Tajawal",
    fontSize: 6.5,
    color: COLORS.gray700,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  tdRight: {
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 22,
    right: 22,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: 6,
  },
  footerText: {
    fontFamily: "Tajawal",
    fontSize: 7,
    color: COLORS.gray700,
  },
});

/** أعمدة من اليمين إلى اليسار (row-reverse): أول عنصر = أقصى اليمين */
const col = {
  idx: "4%",
  date: "13%",
  invNo: "10%",
  toSir: "16%",
  total: "14%",
  currency: "7%",
  payment: "8%",
  lines: "6%",
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

const ROWS_PER_PAGE = 16;

function chunkRows<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}

function TableHead() {
  return (
    <View style={styles.tableHeader} wrap={false}>
      <Text style={[styles.th, { width: col.source }]}>مصدر</Text>
      <Text style={[styles.th, { width: col.lines }]}>بنود</Text>
      <Text style={[styles.th, { width: col.payment }]}>السداد</Text>
      <Text style={[styles.th, { width: col.currency }]}>عملة</Text>
      <Text style={[styles.th, { width: col.total }]}>المجموع</Text>
      <Text style={[styles.th, { width: col.toSir }]}>إلى السيد</Text>
      <Text style={[styles.th, { width: col.invNo }]}>الرقم</Text>
      <Text style={[styles.th, { width: col.date }]}>التاريخ</Text>
      <Text style={[styles.th, { width: col.idx }]}>#</Text>
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

  return (
    <Document>
      {chunks.map((pageRows, pageIdx) => (
        <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
          {pageIdx === 0 ? (
            <>
              <Text style={styles.title}>تقرير سجل الفواتير الصادرة</Text>
              <Text style={styles.subtitle}>تاريخ إنشاء التقرير: {generatedAtStr}</Text>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>ملخص مالي — السجل الظاهر فقط</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>عدد الفواتير</Text>
                    <Text style={styles.summaryValue}>{formatArabicIndicInt(summary.totalInvoices)}</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>فواتير نقدي / مؤجل</Text>
                    <Text style={styles.summaryValue}>
                      {formatArabicIndicInt(summary.nCash)} / {formatArabicIndicInt(summary.nDeferred)}
                    </Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>إجمالي الليرة — نقدي</Text>
                    <Text style={styles.summaryValue}>{formatArabicIndicInt(summary.sypCash)} ل.س</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>إجمالي الليرة — مؤجل</Text>
                    <Text style={styles.summaryValue}>{formatArabicIndicInt(summary.sypDeferred)} ل.س</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>مجموع الليرة</Text>
                    <Text style={styles.summaryValue}>{formatArabicIndicInt(sypAll)} ل.س</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>إجمالي الدولار — نقدي</Text>
                    <Text style={styles.summaryValue}>
                      {summary.usdCash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      USD
                    </Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>إجمالي الدولار — مؤجل</Text>
                    <Text style={styles.summaryValue}>
                      {summary.usdDeferred.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD
                    </Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryLabel}>مجموع الدولار</Text>
                    <Text style={styles.summaryValue}>
                      {usdAll.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </Text>
                  </View>
                </View>
                <Text style={styles.note}>
                  تنبيه: لا يُجمَع الدولار مع الليرة في صف واحد دون مراعاة عمود العملة. هذا التقرير يعكس البيانات
                  المحفوظة في السجل وقت التصدير فقط.
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.pageHint}>
              تقرير سجل الفواتير الصادرة — متابعة الجدول — صفحة {formatArabicIndicInt(pageIdx + 1)} من{" "}
              {formatArabicIndicInt(totalPages)}
            </Text>
          )}

          <TableHead />
          {pageRows.map((r, i) => {
            const globalIdx = pageIdx * ROWS_PER_PAGE + i;
            const even = globalIdx % 2 === 1;
            const truncatedSir = r.toSir.length > 42 ? `${r.toSir.slice(0, 40)}…` : r.toSir;
            const truncatedTotal = r.grandTotalText.length > 28 ? `${r.grandTotalText.slice(0, 26)}…` : r.grandTotalText;
            return (
              <View key={`${r.idx}-${globalIdx}`} style={even ? [styles.tr, styles.trEven] : styles.tr} wrap={false}>
                <Text style={[styles.td, { width: col.source }]}>{r.sourceLabel}</Text>
                <Text style={[styles.td, { width: col.lines }]}>{formatArabicIndicInt(r.linesCount)}</Text>
                <Text style={[styles.td, { width: col.payment }]}>{r.paymentLabel}</Text>
                <Text style={[styles.td, { width: col.currency }]}>{r.currencyLabel}</Text>
                <Text style={[styles.td, styles.tdRight, { width: col.total }]}>{truncatedTotal}</Text>
                <Text style={[styles.td, styles.tdRight, { width: col.toSir }]}>{truncatedSir || "—"}</Text>
                <Text style={[styles.td, { width: col.invNo }]}>{r.invoiceNo || "—"}</Text>
                <Text style={[styles.td, { width: col.date }]}>{r.createdAtDisplay}</Text>
                <Text style={[styles.td, { width: col.idx }]}>{formatArabicIndicInt(r.idx)}</Text>
              </View>
            );
          })}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>عرض أسعار — سجل الفواتير</Text>
            <Text style={styles.footerText}>
              صفحة {formatArabicIndicInt(pageIdx + 1)} / {formatArabicIndicInt(totalPages)}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
