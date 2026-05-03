"use client";

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { grandTotalInArabicWords } from "@/lib/arabic-number-words";

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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    padding: 24,
    direction: "rtl",
    backgroundColor: COLORS.white,
  },
  /** ترويسة المستند */
  letterhead: {
    fontFamily: "Tajawal",
    fontSize: 18,
    fontWeight: 900,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 4,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  metaBlock: {
    fontFamily: "Tajawal",
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
    backgroundColor: COLORS.gray50,
  },
  metaRow: {
    fontFamily: "Tajawal",
    flexDirection: "row-reverse",
    marginBottom: 4,
  },
  metaLabel: {
    fontFamily: "Tajawal",
    width: "22%",
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.primary,
    textAlign: "right",
  },
  metaValue: {
    fontFamily: "Tajawal",
    flex: 1,
    fontSize: 9,
    color: COLORS.gray700,
    textAlign: "right",
  },
  tableHeader: {
    fontFamily: "Tajawal",
    flexDirection: "row-reverse",
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  th: {
    fontFamily: "Tajawal",
    fontSize: 7,
    fontWeight: 700,
    color: COLORS.white,
    textAlign: "center",
  },
  tr: {
    fontFamily: "Tajawal",
    flexDirection: "row-reverse",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    alignItems: "center",
    minHeight: 28,
  },
  trEven: {
    fontFamily: "Tajawal",
    backgroundColor: COLORS.gray50,
  },
  td: {
    fontFamily: "Tajawal",
    fontSize: 7,
    color: COLORS.gray700,
    textAlign: "center",
  },
  tdName: {
    fontFamily: "Tajawal",
    textAlign: "right",
    fontWeight: 700,
    color: "#111827",
  },
  wordsBox: {
    fontFamily: "Tajawal",
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d9e2df",
    borderRadius: 4,
    backgroundColor: COLORS.gray50,
  },
  wordsLabel: {
    fontFamily: "Tajawal",
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.primary,
    textAlign: "right",
    marginBottom: 4,
  },
  wordsText: {
    fontFamily: "Tajawal",
    fontSize: 9,
    color: COLORS.gray700,
    textAlign: "right",
    lineHeight: 1.45,
  },
  totalsRow: {
    fontFamily: "Tajawal",
    marginTop: 8,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "#ecfdf5",
  },
  totalsLabel: {
    fontFamily: "Tajawal",
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.primary,
  },
  totalsValue: {
    fontFamily: "Tajawal",
    fontSize: 11,
    fontWeight: 900,
    color: COLORS.primary,
  },
  footer: {
    fontFamily: "Tajawal",
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  footerText: {
    fontFamily: "Tajawal",
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "center",
  },
  /** سطر «رقماً»: أرقام لاتينية + LTR حتى لا يختلط الفاصل العربي ٬ مع علامات أخرى */
  figuresLine: {
    fontFamily: "Tajawal",
    marginTop: 4,
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.gray700,
    textAlign: "right",
  },
  figuresLtr: {
    fontFamily: "Tajawal",
    direction: "ltr",
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.gray700,
  },
});

/** Column widths (RTL). ترتيب الأعمدة: رمز، اسم، كمية، وحدة، سعر، قيمة */
const col = {
  sku: "12%",
  name: "30%",
  qty: "8%",
  unit: "10%",
  price: "14%",
  value: "26%",
};

export type AdminQuoteLine = {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unitPriceText: string;
  lineValueText: string;
};

export type AdminQuotePdfMeta = {
  toSir: string;
  statement: string;
  invoiceNo: string;
  documentDateStr: string;
  currencyNote: string;
};

export function AdminQuotePDF({
  meta,
  lines,
  grandTotalText,
  grandNumericForWords,
  currency,
}: {
  meta: AdminQuotePdfMeta;
  lines: AdminQuoteLine[];
  grandTotalText: string;
  /** المبلغ الرقمي المستخدم في التفقيط (ل.س صحيحة أو دولار مع فلس) */
  grandNumericForWords: number;
  currency: "SYP" | "USD";
}) {
  const words = grandTotalInArabicWords(grandNumericForWords, currency);
  const n = Number.isFinite(grandNumericForWords) ? Math.max(0, grandNumericForWords) : 0;
  const figuresAmount =
    currency === "SYP"
      ? `${Math.floor(n).toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`
      : `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.letterhead}>قسم الانتاج الفني</Text>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>إلى السيد:</Text>
            <Text style={styles.metaValue}>{meta.toSir || "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>البيان:</Text>
            <Text style={styles.metaValue}>{meta.statement || "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>رقم الفاتورة:</Text>
            <Text style={styles.metaValue}>{meta.invoiceNo || "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>التاريخ:</Text>
            <Text style={styles.metaValue}>{meta.documentDateStr}</Text>
          </View>
          <View style={[styles.metaRow, { marginBottom: 0 }]}>
            <Text style={styles.metaLabel}>العملة:</Text>
            <Text style={styles.metaValue}>{meta.currencyNote}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: col.value }]}>القيمة</Text>
          <Text style={[styles.th, { width: col.price }]}>السعر</Text>
          <Text style={[styles.th, { width: col.unit }]}>الوحدة</Text>
          <Text style={[styles.th, { width: col.qty }]}>الكمية</Text>
          <Text style={[styles.th, { width: col.name, textAlign: "right" }]}>اسم المادة</Text>
          <Text style={[styles.th, { width: col.sku }]}>رمز المادة</Text>
        </View>

        {lines.map((l, i) => {
          const rowStyle = i % 2 === 1 ? [styles.tr, styles.trEven] : styles.tr;
          return (
            <View key={`${i}-${l.sku}-${l.name}`} style={rowStyle}>
              <Text style={[styles.td, { width: col.value }]}>{l.lineValueText}</Text>
              <Text style={[styles.td, { width: col.price }]}>{l.unitPriceText}</Text>
              <Text style={[styles.td, { width: col.unit }]}>{l.unit}</Text>
              <Text style={[styles.td, { width: col.qty }]}>{l.quantity}</Text>
              <Text style={[styles.td, styles.tdName, { width: col.name }]}>{l.name}</Text>
              <Text style={[styles.td, { width: col.sku }]}>{l.sku || "—"}</Text>
            </View>
          );
        })}

        <View style={styles.totalsRow}>
          <Text style={styles.totalsValue}>{grandTotalText}</Text>
          <Text style={styles.totalsLabel}>المجموع النهائي</Text>
        </View>

        <View style={styles.wordsBox}>
          <Text style={styles.wordsLabel}>المبلغ كتابةً:</Text>
          <Text style={styles.wordsText}>{words}</Text>
          <Text style={styles.figuresLine}>
            <Text>رقماً: </Text>
            <Text style={styles.figuresLtr}>{figuresAmount}</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>قسم الانتاج الفني — تم إنشاء المستند آلياً من لوحة الإدارة</Text>
        </View>
      </Page>
    </Document>
  );
}
