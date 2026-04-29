"use client";

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";

const fontBase =
  typeof window !== "undefined"
    ? `${window.location.origin}/fonts/tajawal`
    : "/fonts/tajawal";

Font.register({
  family: "Tajawal",
  fonts: [
    { src: `${fontBase}/ArbFONTS-Tajawal-Regular.ttf`, fontWeight: 400 },
    { src: `${fontBase}/ArbFONTS-Tajawal-Bold.ttf`, fontWeight: 700 },
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
    padding: 28,
    direction: "rtl",
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.primary,
    marginHorizontal: -28,
    marginTop: -28,
    padding: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: COLORS.white,
    textAlign: "center",
  },
  headerSub: {
    fontSize: 10,
    color: "#d4c5a8",
    textAlign: "center",
    marginTop: 4,
  },
  meta: {
    marginTop: 14,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 10,
    color: COLORS.gray700,
    textAlign: "right",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  th: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.white,
    textAlign: "center",
  },
  tr: {
    flexDirection: "row-reverse",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    alignItems: "center",
    minHeight: 34,
  },
  trEven: {
    backgroundColor: COLORS.gray50,
  },
  td: {
    fontSize: 9,
    color: COLORS.gray700,
    textAlign: "center",
  },
  tdName: {
    textAlign: "right",
    fontWeight: 700,
    color: "#111827",
  },
  totalsBox: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d9e2df",
    borderRadius: 6,
    backgroundColor: COLORS.gray50,
  },
  totalsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  totalsLabel: {
    fontSize: 10,
    color: COLORS.gray700,
  },
  totalsValue: {
    fontSize: 12,
    fontWeight: 900,
    color: COLORS.primary,
  },
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

const col = { idx: "7%", name: "41%", unit: "18%", qty: "12%", total: "22%" };

export type AdminQuoteLine = {
  name: string;
  unitPriceText: string;
  quantity: number;
  lineTotalText: string;
};

export function AdminQuotePDF({
  title = "ملف أسعار الهدايا",
  subtitle = "تسعير (سعر فردي + كمية + إجمالي)",
  dateStr,
  lines,
  grandTotalText,
}: {
  title?: string;
  subtitle?: string;
  dateStr: string;
  lines: AdminQuoteLine[];
  grandTotalText: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{subtitle}</Text>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>تاريخ التصدير: {dateStr}</Text>
          <Text style={styles.metaText}>عدد الأصناف: {lines.length}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: col.idx }]}>#</Text>
          <Text style={[styles.th, { width: col.total }]}>الإجمالي</Text>
          <Text style={[styles.th, { width: col.qty }]}>الكمية</Text>
          <Text style={[styles.th, { width: col.unit }]}>السعر الفردي</Text>
          <Text style={[styles.th, { width: col.name, textAlign: "right" }]}>الهدية</Text>
        </View>

        {lines.map((l, i) => {
          const rowStyle = i % 2 === 1 ? [styles.tr, styles.trEven] : styles.tr;
          return (
            <View key={`${i}-${l.name}`} style={rowStyle}>
              <Text style={[styles.td, { width: col.idx }]}>{i + 1}</Text>
              <Text style={[styles.td, { width: col.total }]}>{l.lineTotalText}</Text>
              <Text style={[styles.td, { width: col.qty }]}>{l.quantity}</Text>
              <Text style={[styles.td, { width: col.unit }]}>{l.unitPriceText}</Text>
              <Text style={[styles.td, styles.tdName, { width: col.name }]}>{l.name}</Text>
            </View>
          );
        })}

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsValue}>{grandTotalText}</Text>
            <Text style={styles.totalsLabel}>المجموع النهائي</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>تم إنشاء الملف آلياً من لوحة الإدارة — {new Date().toLocaleDateString("ar-SA")}</Text>
        </View>
      </Page>
    </Document>
  );
}

