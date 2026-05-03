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

/** U+061C: يربط «:» بالنص العربي في PDF فيظهر بعد الكلمة وليس قبلها. */
const AR_COLON = "\u061c:";

/** أرقام عربية شرقية (٠١٢…) — متسقة مع بقية نص PDF وبدون كتلة LTR منفصلة. */
function formatArabicIndicInt(n: number, grouping = true): string {
  const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return v.toLocaleString("ar-SA", { numberingSystem: "arab", useGrouping: grouping });
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Tajawal",
    padding: 24,
    direction: "rtl",
    backgroundColor: COLORS.white,
    position: "relative",
  },
  /** طبقة micro-text خلف المحتوى (شفافة). */
  securityMicroLayer: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    opacity: 0.055,
  },
  securityMicroText: {
    fontFamily: "Tajawal",
    fontSize: 5,
    lineHeight: 1.15,
    color: COLORS.primary,
    textAlign: "right",
  },
  /** علامة مائية مائلة: قسم الإنتاج + رقم الفاتورة */
  securityWatermarkWrap: {
    position: "absolute",
    top: "32%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.09,
  },
  securityWatermarkText: {
    fontFamily: "Tajawal",
    fontSize: 26,
    fontWeight: 700,
    color: COLORS.primary,
    transform: "rotate(-28deg)",
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
  /** تسمية الحقل + «:» في نص واحد؛ U+061C قبل النقطتين تربطهما بالعربية في PDF. */
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
    alignItems: "center",
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
    textAlign: "right",
  },
  totalsValue: {
    fontFamily: "Tajawal",
    fontSize: 11,
    fontWeight: 900,
    color: COLORS.primary,
    textAlign: "left",
  },
  figuresLineText: {
    fontFamily: "Tajawal",
    marginTop: 4,
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.gray700,
    textAlign: "right",
  },
  /** المستلم يميناً، المسلّم يساراً (صف RTL). */
  signatureRow: {
    fontFamily: "Tajawal",
    marginTop: 28,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    flexDirection: "row",
    direction: "rtl",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  signatureBlock: {
    fontFamily: "Tajawal",
    width: "40%",
    alignItems: "center",
  },
  signatureTitle: {
    fontFamily: "Tajawal",
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.gray700,
    marginBottom: 8,
    textAlign: "center",
  },
  signatureLine: {
    width: "100%",
    minHeight: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray700,
  },
});

/** عرض الأعمدة (row-reverse: أول عنصر = أقصى اليمين). الترتيب: رمز المادة، اسم المادة، الوحدة، السعر، القيمة */
const col = {
  sku: "14%",
  name: "36%",
  unit: "11%",
  price: "17%",
  value: "22%",
};

export type AdminQuoteLine = {
  sku: string;
  name: string;
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
  const figuresAmountSyp = `${formatArabicIndicInt(Math.floor(n))} ل.س`;
  const figuresAmountUsd = `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  const microFrag =
    "قسم الانتاج الفني . أصل صادر من النظام . غير صالح للتعديل اليدوي . ";
  const securityMicroBody = Array.from({ length: 14 }, () => microFrag.repeat(4)).join("\n");
  const watermarkPhrase = `قسم الانتاج الفني   ${(meta.invoiceNo || "—").trim()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.securityMicroLayer} fixed>
          <Text style={styles.securityMicroText}>{securityMicroBody}</Text>
        </View>
        <View style={styles.securityWatermarkWrap} fixed>
          <Text style={styles.securityWatermarkText}>{watermarkPhrase}</Text>
        </View>

        <Text style={styles.letterhead}>قسم الانتاج الفني</Text>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{`إلى السيد${AR_COLON}`}</Text>
            <Text style={styles.metaValue}>{meta.toSir || "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{`البيان${AR_COLON}`}</Text>
            <Text style={styles.metaValue}>{meta.statement || "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{`رقم الفاتورة${AR_COLON}`}</Text>
            <Text style={styles.metaValue}>{meta.invoiceNo || "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{`التاريخ${AR_COLON}`}</Text>
            <Text style={styles.metaValue}>{meta.documentDateStr}</Text>
          </View>
          <View style={[styles.metaRow, { marginBottom: 0 }]}>
            <Text style={styles.metaLabel}>{`العملة${AR_COLON}`}</Text>
            <Text style={styles.metaValue}>{meta.currencyNote}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: col.sku }]}>رمز المادة</Text>
          <Text style={[styles.th, { width: col.name, textAlign: "right" }]}>اسم المادة</Text>
          <Text style={[styles.th, { width: col.unit }]}>الوحدة</Text>
          <Text style={[styles.th, { width: col.price }]}>السعر</Text>
          <Text style={[styles.th, { width: col.value }]}>القيمة</Text>
        </View>

        {lines.map((l, i) => {
          const rowStyle = i % 2 === 1 ? [styles.tr, styles.trEven] : styles.tr;
          return (
            <View key={`${i}-${l.sku}-${l.name}`} style={rowStyle}>
              <Text style={[styles.td, { width: col.sku }]}>{l.sku || "—"}</Text>
              <Text style={[styles.td, styles.tdName, { width: col.name }]}>{l.name}</Text>
              <Text style={[styles.td, { width: col.unit }]}>{l.unit}</Text>
              <Text style={[styles.td, { width: col.price }]}>{l.unitPriceText}</Text>
              <Text style={[styles.td, { width: col.value }]}>{l.lineValueText}</Text>
            </View>
          );
        })}

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>المجموع النهائي</Text>
          <Text style={styles.totalsValue}>{grandTotalText}</Text>
        </View>

        <View style={styles.wordsBox}>
          <Text style={styles.wordsLabel}>{`المبلغ كتابةً${AR_COLON}`}</Text>
          <Text style={styles.wordsText}>{words}</Text>
          <Text style={styles.figuresLineText}>
            {`رقماً${AR_COLON} ${currency === "SYP" ? figuresAmountSyp : figuresAmountUsd}`}
          </Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>المستلم</Text>
            <View style={styles.signatureLine} />
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>المسلّم</Text>
            <View style={styles.signatureLine} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
