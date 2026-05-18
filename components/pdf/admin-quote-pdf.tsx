"use client";

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { invoiceAmountInArabicWords } from "@/lib/invoice-amount-words";
import { formatWesternGroupedInteger, formatWesternUsdAmount } from "@/lib/format-western-number";

const fontBase =
  typeof window !== "undefined" ? `${window.location.origin}/fonts/tajawal` : "/fonts/tajawal";
const notoBase =
  typeof window !== "undefined" ? `${window.location.origin}/fonts/noto-naskh-arabic` : "/fonts/noto-naskh-arabic";

Font.register({
  family: "NotoNaskh",
  fonts: [
    { src: `${notoBase}/noto-naskh-arabic-arabic-400-normal.woff`, fontWeight: 400 },
    { src: `${notoBase}/noto-naskh-arabic-arabic-700-normal.woff`, fontWeight: 700 },
  ],
});

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
  gold: "#C8A24A",
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
    position: "relative",
  },
  /** طبقة علامة مائية خلفية (شفافة) تغطي كامل الصفحة. */
  securityBgLayer: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    opacity: 0.055,
  },
  securityBgText: {
    fontFamily: "Tajawal",
    fontSize: 7,
    lineHeight: 1.25,
    color: COLORS.primary,
    textAlign: "right",
    transform: "rotate(-18deg)",
  },
  /** إطار الجدول — نضع عليه ختم شفاف لمنع القص/الاستبدال. */
  tableSecurityWrap: {
    position: "relative",
  },
  /** ختم شفاف فوق الجدول فقط (طبقتان متداخلتان). */
  tableSealWrap: {
    position: "absolute",
    top: 26,
    left: 10,
    right: 10,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.14,
  },
  tableSealTextOlive: {
    fontFamily: "Tajawal",
    fontSize: 16,
    fontWeight: 900,
    color: COLORS.primary,
    textAlign: "center",
  },
  tableSealTextGold: {
    fontFamily: "Tajawal",
    fontSize: 16,
    fontWeight: 900,
    color: COLORS.gold,
    textAlign: "center",
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
  metaRowsWrap: {
    width: "100%",
    alignSelf: "stretch",
  },
  metaRow: {
    fontFamily: "Tajawal",
    flexDirection: "row-reverse",
    marginBottom: 4,
  },
  metaLabel: {
    fontFamily: "Tajawal",
    width: "26%",
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
  invWatermarkWrap: {
    position: "absolute",
    top: "46%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.06,
  },
  invWatermarkText: {
    fontFamily: "Tajawal",
    fontSize: 48,
    fontWeight: 900,
    color: COLORS.gray200,
    transform: "rotate(-24deg)",
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
    fontFamily: "NotoNaskh",
    fontSize: 10,
    fontWeight: 400,
    color: COLORS.gray700,
    direction: "rtl",
    textAlign: "right",
    lineHeight: 1.55,
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
  figuresTitleRow: {
    marginTop: 4,
    flexDirection: "row",
    direction: "rtl",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  figuresLabelText: {
    fontFamily: "Tajawal",
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.gray700,
    textAlign: "right",
  },
  figuresAmountText: {
    fontFamily: "Tajawal",
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.gray700,
    textAlign: "right",
  },
  /** توقيع المسلم فقط */
  signatureRow: {
    fontFamily: "Tajawal",
    marginTop: 28,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    flexDirection: "row",
    direction: "rtl",
    justifyContent: "center",
    alignItems: "flex-start",
    width: "100%",
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

/** عرض الأعمدة (row-reverse: أول عنصر = أقصى اليمين). الترتيب: رمز، اسم، وحدة، عدد، سعر، قيمة */
const col = {
  sku: "12%",
  name: "30%",
  qty: "9%",
  unit: "9%",
  price: "18%",
  value: "22%",
};

export type AdminQuoteLine = {
  sku: string;
  name: string;
  /** كمية السطر (تُعرض في عمود العدد بعد اسم المادة). */
  qty: number;
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
  /** طريقة السداد (نقدي / مؤجل) — تُعرض في صندوق البيانات عند التمرير. */
  paymentLabel?: string;
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
  const words = invoiceAmountInArabicWords(grandNumericForWords, currency);
  const n = Number.isFinite(grandNumericForWords) ? Math.max(0, grandNumericForWords) : 0;
  const figuresAmountSyp = `${formatWesternGroupedInteger(Math.floor(n))} ل.س`;
  const figuresAmountUsd = `${formatWesternUsdAmount(n)} USD`;

  const baseSeal = "قسم الانتاج الفني — أصل صادر من النظام — غير صالح للتعديل اليدوي";
  const baseSealDots = "قسم انتاج الفني . أصل صادر من النظام . غير صالح للتعديل اليدوي .";
  const inv = (meta.invoiceNo || "—").trim();
  const dt = (meta.documentDateStr || "").trim();
  const bgFrag = `${baseSealDots} ${baseSealDots} ${inv ? `${inv} . ` : ""}${dt ? `${dt} .` : ""}`;
  const bgBody = Array.from({ length: 22 }, () => bgFrag).join("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.securityBgLayer} fixed>
          <Text style={styles.securityBgText}>{bgBody}</Text>
        </View>
        <Text style={styles.letterhead}>قسم الانتاج الفني</Text>

        <View style={styles.metaBlock}>
          <View style={styles.metaRowsWrap}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>إلى السيد</Text>
              <Text style={styles.metaValue}>{meta.toSir || "—"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>البيان</Text>
              <Text style={styles.metaValue}>{meta.statement || "—"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>رقم الفاتورة</Text>
              <Text style={styles.metaValue}>{meta.invoiceNo || "—"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>التاريخ</Text>
              <Text style={styles.metaValue}>{meta.documentDateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>طريقة السداد</Text>
              <Text style={styles.metaValue}>{meta.paymentLabel ?? "—"}</Text>
            </View>
            <View style={[styles.metaRow, { marginBottom: 0 }]}>
              <Text style={styles.metaLabel}>العملة</Text>
              <Text style={styles.metaValue}>{meta.currencyNote}</Text>
            </View>
          </View>
        </View>

        <View style={styles.invWatermarkWrap} fixed>
          <Text style={styles.invWatermarkText}>{inv || "—"}</Text>
        </View>

        <View style={styles.tableSecurityWrap}>
          <View style={styles.tableSealWrap}>
            {/* طبقة زيتي */}
            <Text style={styles.tableSealTextOlive}>{baseSeal}</Text>
            {/* طبقة ذهبي (إزاحة بسيطة لمنع القص/التلاعب) */}
            <Text style={[styles.tableSealTextGold, { marginTop: -18, marginRight: 1 }]}>
              {baseSeal}
            </Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: col.sku }]}>رمز المادة</Text>
            <Text style={[styles.th, { width: col.name, textAlign: "right" }]}>اسم المادة</Text>
            <Text style={[styles.th, { width: col.unit }]}>الوحدة</Text>
            <Text style={[styles.th, { width: col.qty }]}>العدد</Text>
            <Text style={[styles.th, { width: col.price }]}>السعر</Text>
            <Text style={[styles.th, { width: col.value }]}>القيمة</Text>
          </View>

          {lines.map((l, i) => {
            const rowStyle = i % 2 === 1 ? [styles.tr, styles.trEven] : styles.tr;
            const q = Math.max(0, Math.floor(Number.isFinite(l.qty) ? l.qty : 0));
            const qtyText = formatWesternGroupedInteger(q, false);
            return (
              <View key={`${i}-${l.sku}-${l.name}-${q}`} style={rowStyle}>
                <Text style={[styles.td, { width: col.sku }]}>{l.sku || "—"}</Text>
                <Text style={[styles.td, styles.tdName, { width: col.name }]}>{l.name}</Text>
                <Text style={[styles.td, { width: col.unit }]}>{l.unit}</Text>
                <Text style={[styles.td, { width: col.qty }]}>{qtyText}</Text>
                <Text style={[styles.td, { width: col.price }]}>{l.unitPriceText}</Text>
                <Text style={[styles.td, { width: col.value }]}>{l.lineValueText}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>المجموع النهائي</Text>
          <Text style={styles.totalsValue}>{grandTotalText}</Text>
        </View>

        <View style={styles.wordsBox}>
          <Text style={styles.wordsLabel}>المبلغ كتابة</Text>
          <Text style={styles.wordsText}>{words}</Text>
          <View style={styles.figuresTitleRow}>
            <Text style={styles.figuresAmountText}>
              {currency === "SYP" ? `${figuresAmountSyp} — رقماً` : `${figuresAmountUsd} — رقماً`}
            </Text>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>المسلم</Text>
            <View style={styles.signatureLine} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
