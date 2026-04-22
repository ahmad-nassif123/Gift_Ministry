"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { getGiftTierLabel, type Product } from "@/data/products";
import { productPageUrl } from "@/lib/site-url";

const QR_API = "https://api.qrserver.com/v1/create-qr-code";

// تسجيل خط Tajawal بجميع الأوزان (من public/fonts/tajawal)
const fontBase =
  typeof window !== "undefined"
    ? `${window.location.origin}/fonts/tajawal`
    : "/fonts/tajawal";

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
  gold: "#baa97c",
  white: "#ffffff",
  gray50: "#f8faf9",
  gray200: "#e2e8e8",
  gray700: "#333333",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    fontFamily: "Tajawal",
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    direction: "rtl",
  },
  header: {
    backgroundColor: COLORS.primary,
    marginHorizontal: -32,
    marginTop: -28,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 32,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 112, height: 40, objectFit: "contain" },
  headerText: { flex: 1, marginHorizontal: 12, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: 800, color: COLORS.white, textAlign: "center" },
  headerSubtitle: { fontSize: 10, fontWeight: 500, color: "#d4c5a8", textAlign: "center", marginTop: 4 },
  meta: { marginTop: 14, marginBottom: 10 },
  metaText: { fontSize: 10, color: COLORS.gray700, textAlign: "right" },
  tableWrapper: {
    borderWidth: 1,
    borderColor: "#d9e2df",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 8,
  },
  tableHeaderRow: { flexDirection: "row-reverse", backgroundColor: "#0f5a4d" },
  th: {
    paddingVertical: 9,
    paddingHorizontal: 6,
    fontSize: 8.5,
    fontWeight: 800,
    color: COLORS.white,
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#1d6b5d",
  },
  tr: {
    flexDirection: "row-reverse",
    borderTopWidth: 1,
    borderTopColor: "#e5ece9",
    minHeight: 42,
    alignItems: "center",
  },
  trEven: { backgroundColor: COLORS.gray50 },
  td: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8.5,
    color: "#374151",
    textAlign: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#edf2f0",
  },
  tdName: { textAlign: "right", color: "#111827", fontWeight: 700 },
  qrImg: { width: 36, height: 36, objectFit: "contain", alignSelf: "center" },
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out.length ? out : [[]];
}

export type CatalogPdfOptions = {
  /** عمود الكمية المتوفرة */
  showQuantity?: boolean;
  /** عمود QR يفتح صفحة المنتج على الموقع */
  showQr?: boolean;
  /** أصل الموقع (مثلاً https://example.com) — مطلوب عند showQr */
  baseUrl?: string;
  /** عدد الصفوف لكل صفحة PDF */
  rowsPerPage?: number;
};

export function CatalogPDFDocument({
  products,
  title,
  subtitle,
  dateStr,
  logoUrl,
  options,
}: {
  products: Product[];
  title: string;
  subtitle?: string;
  dateStr: string;
  logoUrl?: string;
  options?: CatalogPdfOptions;
}) {
  const showQuantity = Boolean(options?.showQuantity);
  const showQr = Boolean(options?.showQr);
  const baseUrl = (options?.baseUrl ?? "").replace(/\/+$/, "");
  const rowsPerPage = options?.rowsPerPage ?? (showQr ? 14 : 28);

  const colSimple = { idx: "8%", sku: "20%", tier: "20%", name: "52%" };
  const colLuxury = {
    idx: "5%",
    qr: "11%",
    qty: "9%",
    sku: "13%",
    tier: "13%",
    name: "49%",
  };

  const pages = chunkArray(products, rowsPerPage);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop
          <Image src={logoUrl} style={styles.logo} />
        ) : (
          <View style={styles.logo} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {(subtitle ?? "").trim() !== "" ? (
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderMeta = () => (
    <View style={styles.meta}>
      <Text style={styles.metaText}>تاريخ التصدير: {dateStr}</Text>
      <Text style={styles.metaText}>عدد الهدايا في هذا الكتالوج: {products.length}</Text>
    </View>
  );

  const tierLabel = (p: Product) =>
    p.giftTier ? getGiftTierLabel(p.giftTier) : "—";

  const qtyLabel = (p: Product) =>
    typeof p.availableQuantity === "number" ? String(p.availableQuantity) : "—";

  const qrSrcFor = (slug: string) => {
    if (!baseUrl) return "";
    const url = productPageUrl(baseUrl, slug);
    return `${QR_API}/?size=120x120&data=${encodeURIComponent(url)}`;
  };

  return (
    <Document>
      {pages.map((pageProducts, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {renderHeader()}
          {renderMeta()}

          <View style={styles.tableWrapper}>
            <View style={styles.tableHeaderRow}>
              {showQr && showQuantity ? (
                <>
                  <Text style={[styles.th, { width: colLuxury.idx }]}>#</Text>
                  <Text style={[styles.th, { width: colLuxury.qr }]}>QR</Text>
                  <Text style={[styles.th, { width: colLuxury.qty }]}>الكمية</Text>
                  <Text style={[styles.th, { width: colLuxury.sku }]}>الكود</Text>
                  <Text style={[styles.th, { width: colLuxury.tier }]}>التصنيف</Text>
                  <Text style={[styles.th, { width: colLuxury.name, textAlign: "right" }]}>اسم الهدية</Text>
                </>
              ) : showQuantity ? (
                <>
                  <Text style={[styles.th, { width: "6%" }]}>#</Text>
                  <Text style={[styles.th, { width: "12%" }]}>الكمية</Text>
                  <Text style={[styles.th, { width: colSimple.sku }]}>الكود</Text>
                  <Text style={[styles.th, { width: colSimple.tier }]}>التصنيف</Text>
                  <Text style={[styles.th, { width: "36%", textAlign: "right" }]}>اسم الهدية</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.th, { width: colSimple.idx }]}>#</Text>
                  <Text style={[styles.th, { width: colSimple.sku }]}>الكود</Text>
                  <Text style={[styles.th, { width: colSimple.tier }]}>التصنيف</Text>
                  <Text style={[styles.th, { width: colSimple.name, textAlign: "right" }]}>اسم الهدية</Text>
                </>
              )}
            </View>

            {pageProducts.map((p, i) => {
              const globalIndex = pageIndex * rowsPerPage + i;
              const rowStyle = globalIndex % 2 === 1 ? [styles.tr, styles.trEven] : styles.tr;
              return (
                <View key={`${p.slug}-${globalIndex}`} style={rowStyle}>
                  {showQr && showQuantity ? (
                    <>
                      <Text style={[styles.td, { width: colLuxury.idx }]}>{globalIndex + 1}</Text>
                      <View style={[styles.td, { width: colLuxury.qr, paddingVertical: 4 }]}>
                        {baseUrl ? (
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <Image src={qrSrcFor(p.slug)} style={styles.qrImg} />
                        ) : (
                          <Text style={{ fontSize: 7 }}>—</Text>
                        )}
                      </View>
                      <Text style={[styles.td, { width: colLuxury.qty }]}>{qtyLabel(p)}</Text>
                      <Text style={[styles.td, { width: colLuxury.sku }]}>{p.sku || "—"}</Text>
                      <Text style={[styles.td, { width: colLuxury.tier }]}>{tierLabel(p)}</Text>
                      <Text style={[styles.td, styles.tdName, { width: colLuxury.name }]}>{p.name}</Text>
                    </>
                  ) : showQuantity ? (
                    <>
                      <Text style={[styles.td, { width: "6%" }]}>{globalIndex + 1}</Text>
                      <Text style={[styles.td, { width: "12%" }]}>{qtyLabel(p)}</Text>
                      <Text style={[styles.td, { width: colSimple.sku }]}>{p.sku || "—"}</Text>
                      <Text style={[styles.td, { width: colSimple.tier }]}>{tierLabel(p)}</Text>
                      <Text style={[styles.td, styles.tdName, { width: "36%" }]}>{p.name}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.td, { width: colSimple.idx }]}>{globalIndex + 1}</Text>
                      <Text style={[styles.td, { width: colSimple.sku }]}>{p.sku || "—"}</Text>
                      <Text style={[styles.td, { width: colSimple.tier }]}>{tierLabel(p)}</Text>
                      <Text style={[styles.td, styles.tdName, { width: colSimple.name }]}>{p.name}</Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </Page>
      ))}
    </Document>
  );
}
