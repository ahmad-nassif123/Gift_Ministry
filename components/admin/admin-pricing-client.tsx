"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Copy,
  Download,
  Eye,
  FileText,
  History,
  LogOut,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { RememberMeCheckbox } from "@/components/remember-me-checkbox";
import { loadRememberedLogin, persistRememberedLogin } from "@/lib/remember-login";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/confirm-dialog-provider";
import type { Product } from "@/data/products";
import { snapshotSeedsToQuote } from "@/lib/admin-invoice-snapshot";
import { pricingGateTitle } from "@/lib/admin-auth-help";
import {
  buildPricingExcelExportRows,
  buildProductSlugByExactSku,
  extractSkuFromPricingExcelRow,
  getPricingExcelColumnValue,
  formatPricingExcelWorksheet,
  PRICING_EXCEL_HEADERS,
} from "@/lib/admin-pricing-excel";
import {
  formatCustomerFacingPrice,
  formatDocumentSypInteger,
  formatGiftPriceUsdLabel,
  getCatalogSypPerUsd,
  parseDocumentSypAmount,
  parseGiftPriceUsdAmount,
  roundCatalogUsd,
  usdAmountToDocumentSyp,
} from "@/lib/catalog-price-display";
import { cn } from "@/lib/utils";

const INVOICE_LS_KEY = "admin_pricing_invoice_log_v1";

/** تحويل خلية Excel (رقم أو نص) إلى نص سعر للموقع (افتراضي USD). */
function normalizeGiftPriceFromExcelCell(raw: unknown): string {
  if (raw === "" || raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `${raw} USD`;
  }
  const s = String(raw)
    .trim()
    .replace(/[\u0660-\u0669]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x0660 + 48));
  if (!s) return "";
  const n = Number(s.replace(/,/g, "").replace(/\s+/g, ""));
  if (Number.isFinite(n) && /^[\d.,\s]+$/.test(s.replace(/-/g, ""))) {
    return `${n} USD`;
  }
  return s;
}

type AdminPricingTab = "gift-list" | "gift-pricing";

type QuoteProductLine = { kind: "product"; slug: string; qty: number };
type QuoteCustomLine = { kind: "custom"; id: string; name: string; unitPriceInput: string; qty: number };
type QuoteLine = QuoteProductLine | QuoteCustomLine;

type PaymentTerms = "cash" | "deferred";

type InvoiceLineSnap = {
  sku: string;
  name: string;
  qty: number;
  unitPriceText: string;
  lineValueText: string;
  custom?: boolean;
  unitUsd?: number;
  unitSyp?: number;
};

type InvoiceHistoryRow = {
  id: string;
  serverId?: number;
  createdAt: string;
  invoiceNo: string;
  documentDateIso: string;
  toSir: string;
  statement: string;
  currency: "SYP" | "USD";
  usdRate: string | null;
  grandTotalText: string;
  grandNumeric: number;
  linesCount: number;
  lines: InvoiceLineSnap[];
  paymentTerms: PaymentTerms;
  fromDb: boolean;
};

function newCustomLineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizePaymentTerms(raw: unknown): PaymentTerms {
  return String(raw ?? "").toLowerCase() === "deferred" ? "deferred" : "cash";
}

function parseStoredInvoice(o: Record<string, unknown>): InvoiceHistoryRow | null {
  const id = String(o.id ?? "");
  const createdAt = String(o.createdAt ?? "");
  if (!id || !createdAt) return null;
  const linesRaw = o.lines;
  const lines: InvoiceLineSnap[] = Array.isArray(linesRaw)
    ? (linesRaw as InvoiceLineSnap[]).map((ln) => ({
        sku: String(ln.sku ?? "—"),
        name: String(ln.name ?? ""),
        qty: Math.max(0, Math.floor(Number(ln.qty) || 0)),
        unitPriceText: String(ln.unitPriceText ?? ""),
        lineValueText: String(ln.lineValueText ?? ""),
        custom: Boolean(ln.custom),
        unitUsd: ln.unitUsd != null && Number.isFinite(Number(ln.unitUsd)) ? Number(ln.unitUsd) : undefined,
        unitSyp: ln.unitSyp != null && Number.isFinite(Number(ln.unitSyp)) ? Number(ln.unitSyp) : undefined,
      }))
    : [];
  const cur = String(o.currency ?? "USD").toUpperCase() === "SYP" ? "SYP" : "USD";
  return {
    id,
    serverId: o.serverId != null ? Number(o.serverId) : undefined,
    createdAt,
    invoiceNo: String(o.invoiceNo ?? ""),
    documentDateIso: String(o.documentDateIso ?? ""),
    toSir: String(o.toSir ?? ""),
    statement: String(o.statement ?? ""),
    currency: cur,
    usdRate: o.usdRate != null && String(o.usdRate).trim() !== "" ? String(o.usdRate) : null,
    grandTotalText: String(o.grandTotalText ?? ""),
    grandNumeric: Number(o.grandNumeric) || 0,
    linesCount: lines.length || Math.max(0, Math.floor(Number(o.linesCount) || 0)),
    lines,
    paymentTerms: normalizePaymentTerms(o.paymentTerms),
    fromDb: false,
  };
}

function readLocalInvoiceHistory(): InvoiceHistoryRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INVOICE_LS_KEY);
    const a = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(a)) return [];
    return a.map((x) => (x && typeof x === "object" ? parseStoredInvoice(x as Record<string, unknown>) : null)).filter((r): r is InvoiceHistoryRow => r != null);
  } catch {
    return [];
  }
}

function writeLocalInvoiceHistory(rows: InvoiceHistoryRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INVOICE_LS_KEY, JSON.stringify(rows.slice(0, 120)));
  } catch {
    //
  }
}

function appendLocalInvoiceHistory(row: InvoiceHistoryRow): void {
  const prev = readLocalInvoiceHistory();
  writeLocalInvoiceHistory([row, ...prev.filter((x) => x.id !== row.id)]);
}

function upsertLocalInvoiceHistory(row: InvoiceHistoryRow): void {
  const prev = readLocalInvoiceHistory();
  writeLocalInvoiceHistory([row, ...prev.filter((x) => x.id !== row.id)]);
}

function removeLocalInvoice(id: string): void {
  const prev = readLocalInvoiceHistory();
  writeLocalInvoiceHistory(prev.filter((x) => x.id !== id));
}

type DocumentCurrency = "SYP" | "USD";

function formatUsdCalculatorDisplay(n: number): string {
  const v = roundCatalogUsd(Math.max(0, n));
  return `${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

function formatSypCalculatorDisplay(n: number): string {
  return formatDocumentSypInteger(n);
}

function parseSypPerUsdInput(raw: string): number {
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : getCatalogSypPerUsd();
}

function documentCurrencyNote(currency: DocumentCurrency): string {
  return currency === "SYP" ? "الليرة السورية الجديدة (ل.س)" : "الدولار الأمريكي";
}

function formatInvoiceDateAr(isoYmd: string): string {
  const p = isoYmd.trim().split("-").map((x) => Number(x));
  const y = p[0];
  const m = p[1];
  const d = p[2];
  if (!y || !m || !d) return isoYmd;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return isoYmd;
  return dt.toLocaleDateString("ar-SY", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/** اسم ملف فريد في كل تحميل حتى لا يُستبدل ملف PDF القديم صامتًا في مجلد التنزيلات (ينطبق على Windows خصوصًا). */
function invoicePdfDownloadFilename(safeInvoiceKey: string, fallbackLabel: string): string {
  return `فاتورة-${safeInvoiceKey || fallbackLabel}-${Date.now()}.pdf`;
}

export function AdminPricingClient() {
  const confirm = useConfirm();
  const [gateOk, setGateOk] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [adminQuery, setAdminQuery] = useState("");
  const [giftListQuery, setGiftListQuery] = useState("");
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [quotePdfLoading, setQuotePdfLoading] = useState(false);
  const [customNameDraft, setCustomNameDraft] = useState("");
  const [customPriceDraft, setCustomPriceDraft] = useState("");
  const [customQtyDraft, setCustomQtyDraft] = useState("1");
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceHistoryRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceLogPdfLoading, setInvoiceLogPdfLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminPricingTab>("gift-list");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("cash");
  const [editingServerId, setEditingServerId] = useState<number | null>(null);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [invoiceEditOpen, setInvoiceEditOpen] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceHistoryRow | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [salePriceDrafts, setSalePriceDrafts] = useState<Record<string, string>>({});
  const [detailDrafts, setDetailDrafts] = useState<Record<string, string>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [importingPrices, setImportingPrices] = useState(false);
  const [applyingImportedPrices, setApplyingImportedPrices] = useState(false);
  const [importPendingSlugs, setImportPendingSlugs] = useState<string[] | null>(null);

  const [invoiceNo, setInvoiceNo] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `INV-${y}${m}${day}`;
  });
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toSir, setToSir] = useState("");
  const [statement, setStatement] = useState("");
  const [documentCurrency, setDocumentCurrency] = useState<DocumentCurrency>("USD");
  const [usdRate, setUsdRate] = useState(() => String(getCatalogSypPerUsd()));

  const checkGate = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing/session", { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; ok?: boolean };
      setGateOk(Boolean(res.ok && json.success && json.ok));
    } catch {
      setGateOk(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const qs = new URLSearchParams();
      qs.set("quick", "1");
      qs.set("include_hidden", "1");
      qs.set("include_archived", "1");
      const res = await fetch(`/api/products?${qs.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { success?: boolean; data?: Product[] };
      if (json.success && Array.isArray(json.data)) setProducts(json.data);
      else setProducts([]);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch("/api/admin/pricing/invoices", { credentials: "include" });
      const j = (await res.json()) as { success?: boolean; data?: unknown[]; db?: boolean };
      if (res.ok && j.success && j.db === true && Array.isArray(j.data)) {
        const mapped: InvoiceHistoryRow[] = j.data.flatMap((raw) => {
          if (!raw || typeof raw !== "object") return [];
          const o = raw as Record<string, unknown>;
          const lineArr = Array.isArray(o.lines) ? o.lines : [];
          const lines: InvoiceLineSnap[] = lineArr.map((ln) => {
            const x = ln as Record<string, unknown>;
            return {
              sku: String(x.sku ?? "—"),
              name: String(x.name ?? ""),
              qty: Math.max(0, Math.floor(Number(x.qty) || 0)),
              unitPriceText: String(x.unitPriceText ?? ""),
              lineValueText: String(x.lineValueText ?? ""),
              custom: Boolean(x.custom),
              unitUsd: x.unitUsd != null && Number.isFinite(Number(x.unitUsd)) ? Number(x.unitUsd) : undefined,
              unitSyp: x.unitSyp != null && Number.isFinite(Number(x.unitSyp)) ? Number(x.unitSyp) : undefined,
            };
          });
          const cur = String(o.currency ?? "USD").toUpperCase() === "SYP" ? "SYP" : "USD";
          const row: InvoiceHistoryRow = {
            id: `srv-${o.id}`,
            serverId: Number(o.id),
            createdAt: String(o.createdAt ?? ""),
            invoiceNo: String(o.invoiceNo ?? ""),
            documentDateIso: o.documentDateIso != null ? String(o.documentDateIso) : "",
            toSir: String(o.toSir ?? ""),
            statement: String(o.statement ?? ""),
            currency: cur,
            usdRate: o.usdRate != null && String(o.usdRate).trim() !== "" ? String(o.usdRate) : null,
            grandTotalText: String(o.grandTotalText ?? ""),
            grandNumeric: Number(o.grandNumeric) || 0,
            linesCount: lines.length,
            lines,
            paymentTerms: normalizePaymentTerms(o.paymentTerms),
            fromDb: true,
          };
          return [row];
        });
        setInvoiceHistory(mapped);
        return;
      }
      setInvoiceHistory(readLocalInvoiceHistory());
    } catch {
      setInvoiceHistory(readLocalInvoiceHistory());
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    void checkGate();
  }, [checkGate]);

  useEffect(() => {
    if (gateOk) return;
    const saved = loadRememberedLogin("pricing");
    if (saved.remember && saved.password) {
      setRememberMe(true);
      setPassword(saved.password);
    }
  }, [gateOk]);

  useEffect(() => {
    if (gateOk) void fetchProducts();
  }, [gateOk, fetchProducts]);

  useEffect(() => {
    if (gateOk) void loadInvoices();
  }, [gateOk, loadInvoices]);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p] as const)), [products]);

  useEffect(() => {
    setPriceDrafts((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const p of products) {
        if (next[p.slug] === undefined) {
          next[p.slug] = String(p.price ?? "").trim();
        }
      }
      return next;
    });
    setSalePriceDrafts((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const p of products) {
        if (next[p.slug] === undefined) {
          next[p.slug] = String(p.salePrice ?? "").trim();
        }
      }
      return next;
    });
    setDetailDrafts((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const p of products) {
        if (next[p.slug] === undefined) {
          next[p.slug] = String(p.pricingDetail ?? "").trim();
        }
      }
      return next;
    });
  }, [products]);
  const adminSearchLower = adminQuery.trim().toLowerCase();
  const adminSearchResults = useMemo(() => {
    if (!adminSearchLower) return [];
    const out: Product[] = [];
    for (const p of products) {
      const hay = `${p.name} ${p.sku} ${p.slug}`.toLowerCase();
      if (hay.includes(adminSearchLower)) out.push(p);
      if (out.length >= 20) break;
    }
    return out;
  }, [products, adminSearchLower]);

  const giftListQueryLower = giftListQuery.trim().toLowerCase();
  const giftListFiltered = useMemo(() => {
    const base = products.filter((p) => !p.archived);
    if (!giftListQueryLower) return base;
    return base.filter((p) => {
      const hay = `${p.name} ${p.sku} ${p.slug}`.toLowerCase();
      return hay.includes(giftListQueryLower);
    });
  }, [products, giftListQueryLower]);
  const giftListTableRows = useMemo(() => giftListFiltered.slice(0, 200), [giftListFiltered]);

  const addQuoteLine = (slug: string) => {
    setQuoteLines((prev) => {
      const found = prev.find((x) => x.kind === "product" && x.slug === slug);
      if (found && found.kind === "product")
        return prev.map((x) =>
          x.kind === "product" && x.slug === slug ? { ...x, qty: Math.min(999999, (x.qty ?? 0) + 1) } : x
        );
      return [...prev, { kind: "product" as const, slug, qty: 1 }];
    });
  };

  const addCustomToQuote = () => {
    const name = customNameDraft.trim();
    if (!name) {
      toast.error("أدخل اسم البند.");
      return;
    }
    const unitUsd = roundCatalogUsd(parseGiftPriceUsdAmount(customPriceDraft));
    if (unitUsd <= 0) {
      toast.error("أدخل سعراً صالحاً بالدولار للبند اليدوي.");
      return;
    }
    const qty = Math.max(1, Math.min(999999, Math.floor(Number(customQtyDraft.replace(/[^\d]/g, "")) || 1)));
    setQuoteLines((prev) => [
      ...prev,
      { kind: "custom" as const, id: newCustomLineId(), name, unitPriceInput: customPriceDraft.trim(), qty },
    ]);
    setCustomNameDraft("");
    setCustomPriceDraft("");
    setCustomQtyDraft("1");
    toast.success("تمت إضافة بند يدوي.");
  };

  const removeQuoteLine = (lineKey: string, kind: "product" | "custom") => {
    setQuoteLines((prev) =>
      prev.filter((x) =>
        kind === "product" ? !(x.kind === "product" && x.slug === lineKey) : !(x.kind === "custom" && x.id === lineKey)
      )
    );
  };

  const setQuoteQty = (lineKey: string, kind: "product" | "custom", value: string) => {
    const v = Math.max(0, Math.min(999999, Math.floor(Number(value.replace(/[^\d]/g, "")) || 0)));
    setQuoteLines((prev) =>
      prev.map((x) => {
        if (kind === "product" && x.kind === "product" && x.slug === lineKey) return { ...x, qty: v };
        if (kind === "custom" && x.kind === "custom" && x.id === lineKey) return { ...x, qty: v };
        return x;
      })
    );
  };

  const setCustomLineName = (id: string, name: string) => {
    setQuoteLines((prev) => prev.map((x) => (x.kind === "custom" && x.id === id ? { ...x, name } : x)));
  };

  const setCustomLinePriceInput = (id: string, unitPriceInput: string) => {
    setQuoteLines((prev) => prev.map((x) => (x.kind === "custom" && x.id === id ? { ...x, unitPriceInput } : x)));
  };

  const sypPerUsd = useMemo(() => parseSypPerUsdInput(usdRate), [usdRate]);

  const quoteComputed = useMemo(() => {
    const isSyp = documentCurrency === "SYP";
    type Computed = {
      rowKey: string;
      lineKind: "product" | "custom";
      slug?: string;
      customId?: string;
      sku: string;
      name: string;
      unitPriceText: string;
      unitUsd: number;
      unitSyp: number;
      qty: number;
      lineTotal: number;
    };
    const lines: Computed[] = [];
    for (const l of quoteLines) {
      if (l.kind === "custom") {
        const qty = Math.max(0, Math.floor(l.qty ?? 0));
        const unitUsd = isSyp ? 0 : roundCatalogUsd(parseGiftPriceUsdAmount(l.unitPriceInput));
        const unitSyp = isSyp ? parseDocumentSypAmount(l.unitPriceInput) : 0;
        const lineTotal = isSyp ? unitSyp * qty : roundCatalogUsd(unitUsd * qty);
        const unitPriceText = isSyp
          ? unitSyp > 0
            ? formatDocumentSypInteger(unitSyp)
            : l.unitPriceInput.trim() || "—"
          : unitUsd > 0
            ? `${unitUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
            : l.unitPriceInput.trim() || "—";
        lines.push({
          rowKey: l.id,
          lineKind: "custom",
          customId: l.id,
          sku: "—",
          name: l.name.trim() || "بند يدوي",
          unitPriceText,
          unitUsd,
          unitSyp,
          qty,
          lineTotal,
        });
        continue;
      }
      const p = bySlug.get(l.slug);
      if (!p) continue;
      const qty = Math.max(0, Math.floor(l.qty ?? 0));
      const unitUsd = roundCatalogUsd(
        parseGiftPriceUsdAmount(String((p.salePrice && p.salePrice.trim()) || p.price || ""))
      );
      const unitSyp = isSyp ? usdAmountToDocumentSyp(unitUsd, sypPerUsd) : 0;
      const lineTotal = isSyp ? unitSyp * qty : roundCatalogUsd(unitUsd * qty);
      const unitPriceText = isSyp
        ? unitSyp > 0
          ? formatDocumentSypInteger(unitSyp)
          : String((p.salePrice && p.salePrice.trim()) || p.price || "").trim() || "—"
        : unitUsd > 0
          ? `${unitUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
          : String((p.salePrice && p.salePrice.trim()) || p.price || "").trim() || "—";
      lines.push({
        rowKey: l.slug,
        lineKind: "product",
        slug: l.slug,
        sku: p.sku,
        name: p.name,
        unitPriceText,
        unitUsd,
        unitSyp,
        qty,
        lineTotal,
      });
    }
    const grandTotal = isSyp
      ? lines.reduce((s, x) => s + x.lineTotal, 0)
      : roundCatalogUsd(lines.reduce((s, x) => s + x.lineTotal, 0));
    return { lines, grandTotal, isSyp };
  }, [quoteLines, bySlug, documentCurrency, sypPerUsd]);

  type BuiltInvoicePayload = {
    lineSnapshots: InvoiceLineSnap[];
    grandNumeric: number;
    grandTotalText: string;
    pdfLines: Array<{
      sku: string;
      name: string;
      qty: number;
      unit: string;
      unitPriceText: string;
      lineValueText: string;
    }>;
    rateStored: string | null;
    paymentLabel: string;
    currencyNote: string;
  };

  const buildInvoiceFromCalculator = (): BuiltInvoicePayload | null => {
    if (quoteComputed.lines.length === 0) return null;
    const isSyp = quoteComputed.isSyp;
    const rateStored = isSyp ? String(sypPerUsd) : null;
    const pdfLines: BuiltInvoicePayload["pdfLines"] = [];
    const lineSnapshots: InvoiceLineSnap[] = [];
    let running = 0;

    for (const l of quoteComputed.lines) {
      const qty = Math.max(0, Math.floor(l.qty));
      const lineVal = l.lineTotal;
      running = isSyp ? running + lineVal : roundCatalogUsd(running + lineVal);
      const unitPriceText = l.unitPriceText || "—";
      const lineValueText =
        lineVal > 0
          ? isSyp
            ? formatDocumentSypInteger(lineVal)
            : `${roundCatalogUsd(lineVal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
          : "—";
      pdfLines.push({
        sku: l.sku || "—",
        name: l.name,
        qty,
        unit: "قطعة",
        unitPriceText,
        lineValueText,
      });
      lineSnapshots.push({
        sku: l.sku || "—",
        name: l.name,
        qty,
        unitPriceText,
        lineValueText,
        custom: l.lineKind === "custom",
        ...(isSyp
          ? l.unitSyp > 0
            ? { unitSyp: l.unitSyp }
            : {}
          : l.unitUsd > 0
            ? { unitUsd: roundCatalogUsd(l.unitUsd) }
            : {}),
      });
    }

    const grandNumeric = isSyp ? Math.floor(running) : roundCatalogUsd(running);
    const grandTotalText = isSyp
      ? formatDocumentSypInteger(grandNumeric)
      : `${grandNumeric.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

    return {
      lineSnapshots,
      grandNumeric,
      grandTotalText,
      pdfLines,
      rateStored,
      paymentLabel: paymentTerms === "deferred" ? "مؤجل" : "نقدي",
      currencyNote: documentCurrencyNote(documentCurrency),
    };
  };

  const persistInvoiceRecord = async (
    built: BuiltInvoicePayload
  ): Promise<"patched" | "local" | "logged" | "failed"> => {
    const { lineSnapshots, grandNumeric, grandTotalText, rateStored } = built;
    const rowId = editingLocalId ?? newCustomLineId();
    const logRow: InvoiceHistoryRow = {
      id: rowId,
      createdAt: new Date().toISOString(),
      invoiceNo: invoiceNo.trim(),
      documentDateIso: invoiceDate,
      toSir: toSir.trim(),
      statement: statement.trim(),
      currency: documentCurrency,
      usdRate: rateStored,
      grandTotalText,
      grandNumeric,
      linesCount: lineSnapshots.length,
      lines: lineSnapshots,
      paymentTerms,
      fromDb: false,
    };

    const pushLocalLog = () => {
      appendLocalInvoiceHistory(logRow);
      setInvoiceHistory((h) => [logRow, ...h.filter((x) => x.id !== logRow.id)].slice(0, 120));
    };

    if (editingServerId != null) {
      try {
        const patchRes = await fetch(`/api/admin/pricing/invoices/${editingServerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            invoiceNo: invoiceNo.trim(),
            documentDateIso: invoiceDate,
            toSir: toSir.trim(),
            statement: statement.trim(),
            currency: documentCurrency,
            usdRate: rateStored,
            grandTotalText,
            grandNumeric,
            lines: lineSnapshots,
            paymentTerms,
          }),
        });
        const pj = (await patchRes.json()) as { success?: boolean };
        if (patchRes.ok && pj.success) {
          setEditingServerId(null);
          setEditingLocalId(null);
          await loadInvoices();
          return "patched";
        }
        return "failed";
      } catch {
        return "failed";
      }
    }

    if (editingLocalId != null) {
      upsertLocalInvoiceHistory(logRow);
      setInvoiceHistory((h) => [logRow, ...h.filter((x) => x.id !== editingLocalId)].slice(0, 120));
      setEditingLocalId(null);
      setEditingServerId(null);
      return "local";
    }

    try {
      const logRes = await fetch("/api/admin/pricing/invoices/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invoiceNo: invoiceNo.trim(),
          documentDateIso: invoiceDate,
          toSir: toSir.trim(),
          statement: statement.trim(),
          currency: documentCurrency,
          usdRate: rateStored,
          grandTotalText,
          grandNumeric,
          lines: lineSnapshots,
          paymentTerms,
        }),
      });
      const lj = (await logRes.json()) as { success?: boolean; stored?: boolean };
      if (logRes.ok && lj.success && lj.stored) {
        await loadInvoices();
        return "logged";
      }
      pushLocalLog();
      return "logged";
    } catch {
      pushLocalLog();
      return "logged";
    }
  };

  const cancelInvoiceEdit = () => {
    setInvoiceEditOpen(false);
    setEditingServerId(null);
    setEditingLocalId(null);
  };

  const saveInvoiceEdit = async () => {
    if (savingInvoice || quotePdfLoading) return;
    if (editingServerId == null && editingLocalId == null) {
      toast.error("لا توجد فاتورة قيد التعديل.");
      return;
    }
    const built = buildInvoiceFromCalculator();
    if (!built) {
      toast.message("أضف بنداً واحداً على الأقل.");
      return;
    }
    setSavingInvoice(true);
    try {
      const result = await persistInvoiceRecord(built);
      if (result === "patched" || result === "local") {
        toast.success("تم حفظ التعديلات.");
        setInvoiceEditOpen(false);
      } else {
        toast.error("تعذر حفظ التعديلات.");
      }
    } finally {
      setSavingInvoice(false);
    }
  };

  const openInvoiceEdit = (row: InvoiceHistoryRow) => {
    setAdminTab("gift-pricing");
    applyInvoiceToForm(row, "edit");
    setInvoiceEditOpen(true);
  };

  const downloadQuotePdf = async () => {
    if (quotePdfLoading) return;
    const built = buildInvoiceFromCalculator();
    if (!built) {
      toast.message("أضف هدية واحدة على الأقل للحساب.");
      return;
    }
    setQuotePdfLoading(true);
    try {
      const { generateAdminQuoteBlob } = await import("@/lib/admin-quote-pdf");
      const blob = await generateAdminQuoteBlob({
        meta: {
          toSir: toSir.trim(),
          statement: statement.trim(),
          invoiceNo: invoiceNo.trim(),
          documentDateStr: formatInvoiceDateAr(invoiceDate),
          currencyNote: built.currencyNote,
          paymentLabel: built.paymentLabel,
        },
        lines: built.pdfLines,
        grandTotalText: built.grandTotalText,
        grandNumericForWords: built.grandNumeric,
        currency: documentCurrency,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeInv = invoiceNo.trim().replace(/[^\w\u0600-\u06FF-]+/g, "_").slice(0, 40);
      a.download = invoicePdfDownloadFilename(safeInv, "عرض-أسعار");
      a.click();
      URL.revokeObjectURL(url);

      const wasEditing = editingServerId != null || editingLocalId != null;
      const result = await persistInvoiceRecord(built);
      if (wasEditing) {
        if (result === "patched" || result === "local") {
          toast.success("تم تحديث الفاتورة في السجل.");
          setInvoiceEditOpen(false);
        } else if (result === "failed") {
          toast.error("تم PDF لكن تعذر تحديث السجل في القاعدة.");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("تعذر إنشاء PDF للأسعار.");
    } finally {
      setQuotePdfLoading(false);
    }
  };

  const downloadProductsExcel = () => {
    const rows = buildPricingExcelExportRows(products, {
      price: priceDrafts,
      salePrice: salePriceDrafts,
      detail: detailDrafts,
    });
    if (rows.length === 0) {
      toast.message("لا توجد هدايا للتصدير.");
      return;
    }
    void import("xlsx")
      .then((XLSX) => {
        const ws = XLSX.utils.json_to_sheet(rows, {
          header: [...PRICING_EXCEL_HEADERS],
          skipHeader: false,
        });
        formatPricingExcelWorksheet(ws, rows.length);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "أسعار الهدايا");
        const name = `هدايا-أسعار-${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, name);
        toast.success("تم تنزيل ملف Excel.");
      })
      .catch(() => {
        toast.error("تعذر إنشاء ملف Excel.");
      });
  };

  const applyInvoiceToForm = (row: InvoiceHistoryRow, mode: "edit" | "reuse") => {
    setInvoiceNo(row.invoiceNo);
    setInvoiceDate(row.documentDateIso ? row.documentDateIso.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setToSir(row.toSir);
    setStatement(row.statement);
    setDocumentCurrency(row.currency);
    if (row.usdRate) setUsdRate(row.usdRate);
    else if (row.currency === "SYP") setUsdRate(String(getCatalogSypPerUsd()));
    setPaymentTerms(row.paymentTerms);
    const rateNum = row.usdRate != null ? Number(String(row.usdRate).replace(/[^\d.]/g, "")) : NaN;
    const sypPerUsd = Number.isFinite(rateNum) && rateNum > 0 ? rateNum : 15000;
    const seeds = snapshotSeedsToQuote(row.lines, products, {
      sypPerUsdFallback: sypPerUsd,
      currency: row.currency,
    });
    const nextLines: QuoteLine[] = [];
    for (const s of seeds) {
      if (s.kind === "product") {
        nextLines.push({ kind: "product", slug: s.slug, qty: s.qty });
      } else {
        nextLines.push({
          kind: "custom",
          id: newCustomLineId(),
          name: s.name,
          unitPriceInput: s.unitPriceInput,
          qty: s.qty,
        });
      }
    }
    setQuoteLines(nextLines);
    if (mode === "edit") {
      if (row.fromDb && row.serverId != null) {
        setEditingServerId(row.serverId);
        setEditingLocalId(null);
      } else {
        setEditingLocalId(row.id);
        setEditingServerId(null);
      }
    } else {
      setEditingServerId(null);
      setEditingLocalId(null);
    }
    if (mode !== "edit") {
      toast.message("تم تحميل البيانات للاستخدام — يمكنك تغيير رقم الفاتورة ثم الطباعة كنسخة جديدة.");
    }
  };

  const reprintInvoicePdf = async (row: InvoiceHistoryRow) => {
    if (row.lines.length === 0) {
      toast.error("لا توجد بنود في هذه الفاتورة.");
      return;
    }
    try {
      const { generateAdminQuoteBlob } = await import("@/lib/admin-quote-pdf");
      const currencyNote = documentCurrencyNote(row.currency);
      const pdfLines = row.lines.map((l) => ({
        sku: l.sku,
        name: l.name,
        qty: l.qty,
        unit: "قطعة",
        unitPriceText: l.unitPriceText,
        lineValueText: l.lineValueText,
      }));
      const blob = await generateAdminQuoteBlob({
        meta: {
          toSir: row.toSir,
          statement: row.statement,
          invoiceNo: row.invoiceNo,
          documentDateStr: formatInvoiceDateAr(row.documentDateIso),
          currencyNote,
          paymentLabel: row.paymentTerms === "deferred" ? "مؤجل" : "نقدي",
        },
        lines: pdfLines,
        grandTotalText: row.grandTotalText,
        grandNumericForWords: row.currency === "SYP" ? Math.floor(row.grandNumeric) : row.grandNumeric,
        currency: row.currency,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeInv = row.invoiceNo.replace(/[^\w\u0600-\u06FF-]+/g, "_").slice(0, 40);
      a.download = invoicePdfDownloadFilename(safeInv, "نسخة");
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم إعداد ملف PDF.");
    } catch (e) {
      console.error(e);
      toast.error("تعذر طباعة الفاتورة.");
    }
  };

  const deleteInvoiceFromLog = async (row: InvoiceHistoryRow) => {
    const ok = await confirm({
      title: "حذف الفاتورة",
      message: `هل تريد حذف هذه الفاتورة من السجل؟\n\nرقم الفاتورة: ${row.invoiceNo || "—"}`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
      danger: true,
    });
    if (!ok) return;
    if (row.fromDb && row.serverId != null) {
      try {
        const res = await fetch(`/api/admin/pricing/invoices/${row.serverId}`, {
          method: "DELETE",
          credentials: "include",
        });
        const j = (await res.json()) as { success?: boolean };
        if (res.ok && j.success) {
          toast.success("تم الحذف من القاعدة.");
          if (previewInvoice?.id === row.id) setPreviewInvoice(null);
          await loadInvoices();
          return;
        }
        toast.error("تعذر الحذف.");
      } catch {
        toast.error("تعذر الحذف.");
      }
      return;
    }
    removeLocalInvoice(row.id);
    setInvoiceHistory((h) => h.filter((x) => x.id !== row.id));
    if (previewInvoice?.id === row.id) setPreviewInvoice(null);
    toast.success("تم الحذف من السجل المحلي.");
  };

  const downloadInvoiceFinancialReport = () => {
    if (invoiceHistory.length === 0) {
      toast.message("لا توجد فواتير في السجل المعروض.");
      return;
    }
    void import("xlsx")
      .then((XLSX) => {
        const list = invoiceHistory;
        let sypCash = 0;
        let sypDef = 0;
        let usdCash = 0;
        let usdDef = 0;
        let nCash = 0;
        let nDef = 0;
        for (const inv of list) {
          const g = inv.grandNumeric;
          if (inv.paymentTerms === "deferred") nDef += 1;
          else nCash += 1;
          if (inv.currency === "SYP") {
            if (inv.paymentTerms === "deferred") sypDef += Math.floor(g);
            else sypCash += Math.floor(g);
          } else {
            if (inv.paymentTerms === "deferred") usdDef += g;
            else usdCash += g;
          }
        }
        const sypAll = sypCash + sypDef;
        const usdAll = usdCash + usdDef;
        const summaryRows = [
          { البند: "ملخص مالي — بناءً على السجل الظاهر فقط", القيمة: "" },
          { البند: "تاريخ إنشاء التقرير", القيمة: new Date().toLocaleString("ar-SY") },
          { البند: "عدد الفواتير في التقرير", القيمة: list.length },
          { البند: "—", القيمة: "—" },
          { البند: "إجمالي فواتير غير USD — نقدي (أرشيف)", القيمة: sypCash },
          { البند: "إجمالي فواتير غير USD — مؤجل (أرشيف)", القيمة: sypDef },
          { البند: "مجموع فواتير غير USD (نقدي + مؤجل)", القيمة: sypAll },
          { البند: "—", القيمة: "—" },
          { البند: "إجمالي الدولار — نقدي", القيمة: Number(usdCash.toFixed(4)) },
          { البند: "إجمالي الدولار — مؤجل", القيمة: Number(usdDef.toFixed(4)) },
          { البند: "مجموع الدولار (نقدي + مؤجل)", القيمة: Number(usdAll.toFixed(4)) },
          { البند: "—", القيمة: "—" },
          { البند: "عدد فواتير نقدي", القيمة: nCash },
          { البند: "عدد فواتير مؤجل", القيمة: nDef },
          {
            البند: "ملاحظة",
            القيمة: "الفواتير الجديدة تُسجَّل بالدولار الأمريكي. صفوف «غير USD» للسجلات القديمة فقط.",
          },
        ];
        const detailRows = list.map((inv, i) => ({
          التسلسل: i + 1,
          التاريخ: new Date(inv.createdAt).toLocaleString("ar-SY"),
          "رقم الفاتورة": inv.invoiceNo,
          الجهة: inv.toSir,
          العملة: inv.currency,
          "السداد": inv.paymentTerms === "deferred" ? "مؤجل" : "نقدي",
          المجموع_النص: inv.grandTotalText,
          المجموع_رقمي: inv.grandNumeric,
          البنود: inv.lines.length,
          المصدر: inv.fromDb ? "قاعدة" : "محلي",
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "ملخص");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "تفصيل");
        XLSX.writeFile(wb, `تقرير-مالي-فواتير-${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("تم تنزيل التقرير.");
      })
      .catch(() => toast.error("تعذر إنشاء التقرير."));
  };

  const downloadInvoiceLogPdf = async () => {
    if (invoiceHistory.length === 0) {
      toast.message("لا توجد فواتير في السجل المعروض.");
      return;
    }
    if (invoiceLogPdfLoading) return;
    setInvoiceLogPdfLoading(true);
    try {
      const { computeInvoiceLogSummary, mapSourcesToPdfRows, generateInvoiceLogReportBlob } = await import(
        "@/lib/admin-invoice-log-report-pdf"
      );
      const sources = invoiceHistory.map((inv) => ({
        createdAt: inv.createdAt,
        invoiceNo: inv.invoiceNo,
        toSir: inv.toSir,
        grandTotalText: inv.grandTotalText,
        grandNumeric: Number(inv.grandNumeric) || 0,
        currency: inv.currency,
        paymentTerms: inv.paymentTerms,
        linesCount: inv.lines.length || inv.linesCount,
        fromDb: inv.fromDb,
      }));
      const summary = computeInvoiceLogSummary(sources);
      const rows = mapSourcesToPdfRows(sources);
      const now = new Date();
      const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
      const generatedAtStr = `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} — ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      const blob = await generateInvoiceLogReportBlob({ generatedAtStr, rows, summary });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير-سجل-فواتير-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل تقرير PDF.");
    } catch (e) {
      console.error(e);
      toast.error("تعذر إنشاء تقرير PDF.");
    } finally {
      setInvoiceLogPdfLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/pricing/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, rememberMe }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        persistRememberedLogin("pricing", password, rememberMe);
        toast.success("تم الدخول.");
        if (!rememberMe) setPassword("");
        await checkGate();
        return;
      }
      toast.error(json.error || (res.status === 503 ? "تسجيل الدخول غير مفعّل على الخادم" : "كلمة المرور غير صحيحة"));
    } catch {
      toast.error("حدث خطأ أثناء الدخول.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/pricing/logout", { method: "POST", credentials: "include" });
    } catch {
      //
    }
    setProducts([]);
    setQuoteLines([]);
    setPriceDrafts({});
    setSalePriceDrafts({});
    setDetailDrafts({});
    setSavingSlug(null);
    setCustomNameDraft("");
    setCustomPriceDraft("");
    setCustomQtyDraft("1");
    setInvoiceHistory([]);
    setPaymentTerms("cash");
    setEditingServerId(null);
    setEditingLocalId(null);
    setInvoiceEditOpen(false);
    setPreviewInvoice(null);
    setToSir("");
    setStatement("");
    setUsdRate("15000");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    const d = new Date();
    setInvoiceNo(`INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
    setAdminTab("gift-list");
    setImportPendingSlugs(null);
    setGateOk(false);
    toast.message("تم الخروج.");
  };

  const saveProductPrice = async (
    slug: string,
    opts?: {
      silent?: boolean;
      batch?: boolean;
      price?: string;
      salePrice?: string;
      pricingDetail?: string;
    }
  ) => {
    if (savingSlug && !opts?.batch) return;
    setSavingSlug(slug);
    try {
      const draft = (opts?.price ?? priceDrafts[slug] ?? "").trim();
      const saleDraft = (opts?.salePrice ?? salePriceDrafts[slug] ?? "").trim();
      const detailDraft = (opts?.pricingDetail ?? detailDrafts[slug] ?? "").trim();
      const res = await fetch("/api/admin/pricing/product-price", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          price: draft,
          salePrice: saleDraft,
          pricingDetail: detailDraft,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; data?: Product };
      if (!res.ok || !json.success || !json.data) {
        if (!opts?.silent) toast.error(json.error || "تعذر حفظ السعر.");
        return false;
      }
      setProducts((prev) => prev.map((p) => (p.slug === slug ? json.data! : p)));
      setPriceDrafts((prev) => ({ ...prev, [slug]: String(json.data!.price ?? "").trim() }));
      setSalePriceDrafts((prev) => ({ ...prev, [slug]: String(json.data!.salePrice ?? "").trim() }));
      setDetailDrafts((prev) => ({ ...prev, [slug]: String(json.data!.pricingDetail ?? "").trim() }));
      if (!opts?.silent) toast.success("تم حفظ الأسعار.");
      return true;
    } catch {
      if (!opts?.silent) toast.error("حدث خطأ أثناء حفظ السعر.");
      return false;
    } finally {
      setSavingSlug(null);
    }
  };

  const importPricesFromExcel = async (file: File) => {
    if (importingPrices) return;
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("الملف يجب أن يكون Excel (.xlsx أو .xls).");
      return;
    }
    setImportingPrices(true);
    setImportPendingSlugs(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) {
        toast.error("ملف Excel لا يحتوي على صفحات.");
        return;
      }
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
      if (!rows.length) {
        toast.error("ملف Excel فارغ.");
        return;
      }

      const bySkuExact = buildProductSlugByExactSku(products);
      const nextPrice: Record<string, string> = {};
      const nextSale: Record<string, string> = {};
      const nextDetail: Record<string, string> = {};
      const touched = new Set<string>();
      let skipped = 0;
      const unknownSkus: string[] = [];

      for (const r of rows) {
        const skuRaw = extractSkuFromPricingExcelRow(r);
        if (!skuRaw) {
          skipped += 1;
          continue;
        }

        const resolvedSlug = bySkuExact.get(skuRaw);
        if (!resolvedSlug) {
          skipped += 1;
          if (unknownSkus.length < 12) unknownSkus.push(skuRaw);
          continue;
        }

        const priceCell = getPricingExcelColumnValue(r, "السعر", "price", "Price", "PRICE");
        const saleCell = getPricingExcelColumnValue(r, "سعر المبيع", "salePrice", "SalePrice");
        const detailCell = getPricingExcelColumnValue(r, "التفصيل", "pricingDetail", "PricingDetail");

        const priceNorm = normalizeGiftPriceFromExcelCell(priceCell);
        const saleNorm = normalizeGiftPriceFromExcelCell(saleCell);
        const detailStr = String(detailCell ?? "").trim();

        if (!priceNorm && !saleNorm && !detailStr) {
          skipped += 1;
          continue;
        }

        if (priceNorm) nextPrice[resolvedSlug] = priceNorm;
        if (saleNorm) nextSale[resolvedSlug] = saleNorm;
        if (detailStr) nextDetail[resolvedSlug] = detailStr;
        touched.add(resolvedSlug);
      }

      if (touched.size === 0) {
        const hint =
          unknownSkus.length > 0
            ? ` أمثلة SKU غير موجودة في الموقع: ${unknownSkus.slice(0, 5).join("، ")}`
            : "";
        toast.error(
          `لم يتم العثور على صفوف مطابقة. تأكد من عمود SKU (نفس الكود في الموقع حرفياً) وأن أحد أعمدة السعر غير فارغ.${hint}`
        );
        return;
      }

      const slugList = [...touched];
      setPriceDrafts((prev) => ({ ...prev, ...nextPrice }));
      setSalePriceDrafts((prev) => ({ ...prev, ...nextSale }));
      setDetailDrafts((prev) => ({ ...prev, ...nextDetail }));

      setApplyingImportedPrices(true);
      let applied = 0;
      let applyFail = 0;
      for (const slug of slugList) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const done = await saveProductPrice(slug, {
            silent: true,
            batch: true,
            price: nextPrice[slug],
            salePrice: nextSale[slug],
            pricingDetail: nextDetail[slug],
          });
          if (done) applied += 1;
          else applyFail += 1;
        } catch {
          applyFail += 1;
        }
      }
      setApplyingImportedPrices(false);
      setImportPendingSlugs(null);

      let msg = `تم تطبيق ${applied} هدية على الموقع من ملف Excel (مطابقة SKU).`;
      if (skipped > 0) msg += ` تم تجاهل ${skipped} صفاً.`;
      if (applyFail > 0) msg += ` فشل الحفظ لـ ${applyFail} هدية.`;
      if (unknownSkus.length > 0) {
        msg += ` SKU غير موجود: ${unknownSkus.slice(0, 5).join("، ")}${unknownSkus.length > 5 ? "…" : ""}`;
      }
      if (applied > 0) toast.success(msg);
      else toast.error(msg);
    } catch (e) {
      console.error(e);
      toast.error("تعذر قراءة ملف Excel.");
    } finally {
      setImportingPrices(false);
    }
  };

  const applyImportedPrices = async () => {
    if (applyingImportedPrices) return;
    if (!importPendingSlugs || importPendingSlugs.length === 0) {
      toast.message("لم يتم استيراد بيانات بعد.");
      return;
    }
    setApplyingImportedPrices(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const slug of importPendingSlugs) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const done = await saveProductPrice(slug, { silent: true, batch: true });
          if (done) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
      }
      if (fail === 0) toast.success(`تم تحديث ${ok} هدية في الموقع.`);
      else toast.message(`تم تحديث ${ok} هدية، وفشل ${fail}.`);
      setImportPendingSlugs(null);
    } finally {
      setApplyingImportedPrices(false);
    }
  };

  if (gateOk === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }

  if (!gateOk) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {pricingGateTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="admin-pricing-pass" className="mb-1 block text-sm font-medium">
                    كلمة المرور
                  </label>
                  <PasswordInput
                    id="admin-pricing-pass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <RememberMeCheckbox
                  id="admin-pricing-remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => {
                    setRememberMe(checked);
                    if (!checked) persistRememberedLogin("pricing", "", false);
                  }}
                />
                <Button type="submit" className="min-h-[44px] w-full" disabled={loggingIn}>
                  {loggingIn ? "جاري الدخول..." : "دخول"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/" className="underline hover:text-foreground">
                    العودة للرئيسية
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="mb-1 text-2xl font-bold sm:text-3xl">الإدارة</h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                قائمة الهدايا والأسعار، أو تسعير الهدايا وحاسبة العروض وتصدير PDF.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => downloadProductsExcel()}
                disabled={loadingProducts || products.filter((p) => !p.archived).length === 0}
              >
                <Download className="ml-2 h-4 w-4" />
                Excel
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void fetchProducts()} disabled={loadingProducts}>
                {loadingProducts ? "جاري التحديث..." : "تحديث القائمة"}
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void handleLogout()}>
                <LogOut className="ml-2 h-4 w-4" />
                خروج
              </Button>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" role="tablist" aria-label="أقسام الإدارة">
            <div className="flex w-full flex-row-reverse flex-wrap gap-1 rounded-lg border bg-muted/40 p-1 sm:w-auto sm:inline-flex">
              <button
                type="button"
                role="tab"
                aria-selected={adminTab === "gift-list"}
                className={cn(
                  "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-initial",
                  adminTab === "gift-list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setAdminTab("gift-list")}
              >
                <Package className="h-4 w-4 shrink-0" />
                قائمة الهدايا والأسعار
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={adminTab === "gift-pricing"}
                className={cn(
                  "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-initial",
                  adminTab === "gift-pricing"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setAdminTab("gift-pricing")}
              >
                <Calculator className="h-4 w-4 shrink-0" />
                تسعير الهدايا
              </button>
            </div>
          </div>

          {adminTab === "gift-pricing" && (
            <>
          <Card className="mb-6">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <History className="h-5 w-5 shrink-0" />
                سجل الفواتير الصادرة
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="min-h-[44px] bg-[#0b443a] hover:bg-[#0b443a]/90"
                  onClick={() => void downloadInvoiceLogPdf()}
                  disabled={invoiceHistory.length === 0 || invoiceLogPdfLoading}
                >
                  <FileText className="ml-2 h-4 w-4" />
                  {invoiceLogPdfLoading ? "جاري إعداد PDF..." : "تقرير PDF احترافي"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => downloadInvoiceFinancialReport()}
                  disabled={invoiceHistory.length === 0}
                >
                  <Download className="ml-2 h-4 w-4" />
                  تقرير مالي (Excel)
                </Button>
                <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => void loadInvoices()} disabled={loadingInvoices}>
                  {loadingInvoices ? "جاري التحميل..." : "تحديث السجل"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoiceHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد فواتير مسجّلة بعد. يُضاف سجل تلقائياً عند كل تحميل PDF بنجاح. عند توفر Postgres تُخزّن في القاعدة؛ وإلا يُحفظ السجل في هذا المتصفح فقط.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full min-w-[880px] text-right text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">الرقم</th>
                        <th className="p-2 max-w-[120px]">الجهة</th>
                        <th className="p-2">المجموع</th>
                        <th className="p-2 w-14">عملة</th>
                        <th className="p-2 w-20">السداد</th>
                        <th className="p-2 w-12">بنود</th>
                        <th className="p-2 w-14">مصدر</th>
                        <th className="p-2 text-center min-w-[200px]">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceHistory.map((row) => (
                        <tr key={row.id} className="border-t align-middle">
                          <td className="p-2 whitespace-nowrap text-xs tabular-nums">
                            {(() => {
                              try {
                                return new Date(row.createdAt).toLocaleString("ar-SY");
                              } catch {
                                return row.createdAt;
                              }
                            })()}
                          </td>
                          <td className="p-2 font-medium">{row.invoiceNo || "—"}</td>
                          <td className="p-2 max-w-[120px] truncate text-xs" title={row.toSir || undefined}>
                            {row.toSir || "—"}
                          </td>
                          <td className="p-2 tabular-nums text-xs">{row.grandTotalText || "—"}</td>
                          <td className="p-2">{row.currency === "USD" ? "USD" : "ل.س"}</td>
                          <td className="p-2 text-xs">{row.paymentTerms === "deferred" ? "مؤجل" : "نقدي"}</td>
                          <td className="p-2 text-center tabular-nums">{row.lines.length || row.linesCount}</td>
                          <td className="p-2 text-muted-foreground text-xs">{row.fromDb ? "قاعدة" : "محلي"}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 px-2"
                                onClick={() => setPreviewInvoice(row)}
                                title="معاينة"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 px-2"
                                onClick={() => openInvoiceEdit(row)}
                                title="تعديل"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 px-2"
                                onClick={() => applyInvoiceToForm(row, "reuse")}
                                title="إعادة استخدام"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 px-2"
                                onClick={() => void reprintInvoicePdf(row)}
                                title="طباعة"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-9 px-2"
                                onClick={() => void deleteInvoiceFromLog(row)}
                                title="حذف"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {invoiceEditOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60"
              aria-hidden
              onClick={() => cancelInvoiceEdit()}
            />
          )}

          <Card
            className={cn(
              "mb-6",
              invoiceEditOpen &&
                "fixed inset-2 z-50 m-0 flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden shadow-2xl sm:inset-4"
            )}
          >
            {invoiceEditOpen && (
              <div className="shrink-0 border-b bg-background px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">تعديل الفاتورة</h2>
                    <p className="text-sm text-muted-foreground tabular-nums">{invoiceNo || "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[44px]"
                      onClick={() => cancelInvoiceEdit()}
                      disabled={savingInvoice || quotePdfLoading}
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px]"
                      onClick={() => void downloadQuotePdf()}
                      disabled={quotePdfLoading || quoteComputed.lines.length === 0}
                    >
                      <FileText className="ml-2 h-4 w-4" />
                      {quotePdfLoading ? "جاري PDF..." : "تحميل PDF"}
                    </Button>
                    <Button
                      type="button"
                      className="min-h-[44px] bg-[#0b443a] hover:bg-[#0b443a]/90"
                      onClick={() => void saveInvoiceEdit()}
                      disabled={savingInvoice || quotePdfLoading || quoteComputed.lines.length === 0}
                    >
                      {savingInvoice ? "جاري الحفظ..." : "حفظ التعديلات"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <CardHeader className={cn(invoiceEditOpen && "shrink-0 pb-2")}>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {invoiceEditOpen ? "محرر الفاتورة" : "تسعير الهدايا"}
              </CardTitle>
            </CardHeader>
            <CardContent
              className={cn("space-y-4", invoiceEditOpen && "min-h-0 flex-1 overflow-y-auto overscroll-contain")}
            >
              {!invoiceEditOpen && (
                <p className="text-sm text-muted-foreground">
                  ابحث عن هدية وأضفها للحساب، ثم حدّد الكمية لتحصل على الإجمالي ويمكنك تحميل PDF.
                </p>
              )}

              <div className="rounded-lg border bg-card p-4 space-y-4">
                <p className="text-sm font-semibold">بيانات الفاتورة (PDF)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="inv-no" className="mb-1 block text-sm text-muted-foreground">
                      رقم الفاتورة
                    </label>
                    <Input id="inv-no" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="min-h-[44px]" />
                  </div>
                  <div>
                    <label htmlFor="inv-date" className="mb-1 block text-sm text-muted-foreground">
                      التاريخ
                    </label>
                    <Input id="inv-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="min-h-[44px]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="inv-to" className="mb-1 block text-sm text-muted-foreground">
                      الجهة
                    </label>
                    <Input id="inv-to" value={toSir} onChange={(e) => setToSir(e.target.value)} placeholder="اسم الجهة أو الشخص" className="min-h-[44px]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="inv-st" className="mb-1 block text-sm text-muted-foreground">
                      البيان
                    </label>
                    <textarea
                      id="inv-st"
                      value={statement}
                      onChange={(e) => setStatement(e.target.value)}
                      placeholder="وصف مختصر للمعاملة أو الغرض من عرض السعر..."
                      rows={3}
                      className={cn(
                        "flex w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[88px]"
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">عملة المستند</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="document-currency"
                        className="h-4 w-4"
                        checked={documentCurrency === "USD"}
                        onChange={() => setDocumentCurrency("USD")}
                      />
                      الدولار الأمريكي (USD)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="document-currency"
                        className="h-4 w-4"
                        checked={documentCurrency === "SYP"}
                        onChange={() => setDocumentCurrency("SYP")}
                      />
                      الليرة السورية الجديدة (ل.س)
                    </label>
                  </div>
                  {documentCurrency === "SYP" && (
                    <div className="pt-1">
                      <label htmlFor="inv-syp-rate" className="mb-1 block text-sm text-muted-foreground">
                        سعر صرف الدولار (ل.س لكل 1 USD)
                      </label>
                      <Input
                        id="inv-syp-rate"
                        value={usdRate}
                        onChange={(e) => setUsdRate(e.target.value)}
                        inputMode="numeric"
                        className="min-h-[44px] max-w-xs tabular-nums"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        تُحوَّل أسعار الهدايا من الكتالوج (USD) تلقائياً. أدخل البنود اليدوية بالليرة مباشرة.
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm text-muted-foreground">طريقة السداد (تظهر في PDF وسجل الفواتير)</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="payment-terms"
                        className="h-4 w-4"
                        checked={paymentTerms === "cash"}
                        onChange={() => setPaymentTerms("cash")}
                      />
                      نقدي
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="payment-terms"
                        className="h-4 w-4"
                        checked={paymentTerms === "deferred"}
                        onChange={() => setPaymentTerms("deferred")}
                      />
                      مؤجل
                    </label>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="بحث (الاسم / SKU / slug)..."
                  value={adminQuery}
                  onChange={(e) => setAdminQuery(e.target.value)}
                  className="pr-10 min-h-[44px] text-base"
                />
              </div>

              {adminQuery.trim() !== "" && (
                <Card className="border-dashed">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">نتائج البحث</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {adminSearchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا توجد نتائج.</p>
                    ) : (
                      <ul className="space-y-2">
                        {adminSearchResults.map((p) => {
                          const already = quoteLines.some((x) => x.kind === "product" && x.slug === p.slug);
                          return (
                            <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <Badge variant="outline">كود: {p.sku}</Badge>
                                  <Badge variant="outline">السعر: {formatCustomerFacingPrice(p)}</Badge>
                                </div>
                              </div>
                              <Button type="button" onClick={() => addQuoteLine(p.slug)} disabled={already} className="min-h-[44px] shrink-0">
                                <Plus className="ml-2 h-5 w-5" />
                                {already ? "مضاف" : "إضافة"}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="border-primary/25">
                <CardHeader className="py-4">
                  <CardTitle className="text-base">بند يدوي (غير مضاف للموقع)</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    أدخل اسماً وسعراً وكمية دون إنشاء منتج في الكتالوج — يظهر في الحاسبة وفي PDF مثل باقي البنود.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="custom-line-name" className="mb-1 block text-sm text-muted-foreground">
                      اسم البند
                    </label>
                    <Input
                      id="custom-line-name"
                      value={customNameDraft}
                      onChange={(e) => setCustomNameDraft(e.target.value)}
                      placeholder="مثال: تغليف خاص"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-line-price" className="mb-1 block text-sm text-muted-foreground">
                      {documentCurrency === "SYP" ? "السعر (ل.س)" : "السعر (USD)"}
                    </label>
                    <Input
                      id="custom-line-price"
                      value={customPriceDraft}
                      onChange={(e) => setCustomPriceDraft(e.target.value)}
                      placeholder={
                        documentCurrency === "SYP"
                          ? "مثال: 150000 أو 150000 ل.س"
                          : "مثال: 12.50 أو 12.50 USD"
                      }
                      inputMode="decimal"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-line-qty" className="mb-1 block text-sm text-muted-foreground">
                      العدد
                    </label>
                    <Input
                      id="custom-line-qty"
                      value={customQtyDraft}
                      onChange={(e) => setCustomQtyDraft(e.target.value)}
                      inputMode="numeric"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Button type="button" className="min-h-[44px]" onClick={() => addCustomToQuote()}>
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة للحاسبة
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">حاسبة الأسعار</CardTitle>
                    {!invoiceEditOpen && (
                      <Button
                        type="button"
                        onClick={() => void downloadQuotePdf()}
                        disabled={quotePdfLoading || quoteComputed.lines.length === 0}
                        className="min-h-[44px]"
                      >
                        <FileText className="ml-2 h-4 w-4" />
                        {quotePdfLoading ? "جاري إنشاء PDF..." : "تحميل PDF"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {quoteComputed.lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد بنود في الحاسبة بعد.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                        <table className="w-full min-w-[760px] text-right text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-3 w-10">#</th>
                              <th className="p-3 w-24">المصدر</th>
                              <th className="p-3">الاسم</th>
                              <th className="p-3 w-24">SKU</th>
                              <th className="p-3 min-w-[120px]">السعر الفردي</th>
                              <th className="p-3 w-28">الكمية</th>
                              <th className="p-3 w-28">الإجمالي</th>
                              <th className="p-3 w-16">حذف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quoteComputed.lines.map((l, idx) => {
                              const rawCustom =
                                l.lineKind === "custom" && l.customId
                                  ? (quoteLines.find((x) => x.kind === "custom" && x.id === l.customId) as QuoteCustomLine | undefined)
                                  : undefined;
                              return (
                                <tr key={l.rowKey} className="border-t align-middle">
                                  <td className="p-3">{idx + 1}</td>
                                  <td className="p-3">
                                    {l.lineKind === "custom" ? (
                                      <Badge variant="secondary">يدوي</Badge>
                                    ) : (
                                      <Badge variant="outline">موقع</Badge>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {l.lineKind === "custom" && l.customId ? (
                                      <Input
                                        value={rawCustom?.name ?? ""}
                                        onChange={(e) => setCustomLineName(l.customId!, e.target.value)}
                                        className="min-h-[44px] font-medium"
                                      />
                                    ) : (
                                      <span className="font-medium">{l.name}</span>
                                    )}
                                  </td>
                                  <td className="p-3">{l.sku || "—"}</td>
                                  <td className="p-3">
                                    {l.lineKind === "custom" && l.customId ? (
                                      <Input
                                        value={rawCustom?.unitPriceInput ?? ""}
                                        onChange={(e) => setCustomLinePriceInput(l.customId!, e.target.value)}
                                        inputMode="decimal"
                                        className="min-h-[44px] tabular-nums"
                                        placeholder={documentCurrency === "SYP" ? "ل.س" : "USD"}
                                      />
                                    ) : (
                                      l.unitPriceText || "—"
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      value={String(l.qty)}
                                      onChange={(e) => setQuoteQty(l.rowKey, l.lineKind, e.target.value)}
                                      inputMode="numeric"
                                      className="min-h-[44px] w-28 text-center tabular-nums"
                                    />
                                  </td>
                                  <td className="p-3 tabular-nums">
                                    {l.lineTotal > 0
                                      ? quoteComputed.isSyp
                                        ? formatSypCalculatorDisplay(l.lineTotal)
                                        : formatUsdCalculatorDisplay(l.lineTotal)
                                      : "—"}
                                  </td>
                                  <td className="p-3">
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="min-h-[44px]"
                                      onClick={() => removeQuoteLine(l.rowKey, l.lineKind)}
                                    >
                                      <X className="h-4 w-4" />
                                      <span className="sr-only">حذف</span>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                        <div className="text-sm text-muted-foreground">المجموع النهائي</div>
                        <div className="text-lg font-bold tabular-nums">{quoteComputed.isSyp
                            ? formatSypCalculatorDisplay(quoteComputed.grandTotal)
                            : formatUsdCalculatorDisplay(quoteComputed.grandTotal)}</div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
            </>
          )}

          {adminTab === "gift-list" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-5 w-5 shrink-0" />
                  قائمة الهدايا والأسعار
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  السعر الأساسي وسعر المبيع والتفصيل — للإدارة فقط ولا تظهر في الموقع العام.
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-lg border bg-card p-4 space-y-3">
                  <p className="text-sm font-semibold">استيراد أسعار من Excel</p>
                  <p className="text-xs text-muted-foreground">
                    يدعم الأعمدة: <span className="font-medium">SKU</span> (مطابقة حرفية مع الموقع — مثل G02)، و
                    <span className="font-medium">سعر المبيع</span> و/أو <span className="font-medium">السعر</span> و/أو{" "}
                    <span className="font-medium">التفصيل</span>.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importPricesFromExcel(f);
                        e.currentTarget.value = "";
                      }}
                      className="block w-full text-sm"
                      disabled={importingPrices || loadingProducts}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px] sm:shrink-0"
                      disabled={!importPendingSlugs?.length || applyingImportedPrices || savingSlug != null}
                      onClick={() => void applyImportedPrices()}
                    >
                      {applyingImportedPrices ? "جاري التحديث..." : "تطبيق الأسعار على الموقع"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    بعد اختيار الملف تُطابق الأعمدة حسب SKU وتُحفظ الأسعار على الموقع تلقائياً.
                  </p>
                </div>

                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="بحث عن هدية (الاسم أو SKU)..."
                    value={giftListQuery}
                    onChange={(e) => setGiftListQuery(e.target.value)}
                    className="min-h-[44px] pr-10 text-base"
                    aria-label="بحث في قائمة الهدايا والأسعار"
                  />
                  {giftListQuery.trim() !== "" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 h-9 w-9 -translate-y-1/2"
                      onClick={() => setGiftListQuery("")}
                      aria-label="مسح البحث"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <p className="mb-2 text-xs text-muted-foreground lg:hidden">
                  مرّر الجدول أفقياً لرؤية سعر المبيع والتفصيل.
                </p>
                <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full min-w-[960px] text-right text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 w-10">#</th>
                        <th className="p-3">الهدية</th>
                        <th className="p-3 w-24">SKU</th>
                        <th className="p-3 min-w-[130px] bg-brand-green-dark/10 font-semibold text-brand-green-dark">
                          سعر المبيع
                        </th>
                        <th className="p-3 min-w-[130px]">السعر</th>
                        <th className="p-3 w-28">حفظ</th>
                        <th className="p-3 w-28">إضافة للحاسبة</th>
                        <th className="p-3 min-w-[100px] text-muted-foreground font-normal">التفصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftListTableRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            {giftListQuery.trim()
                              ? "لا توجد هدية تطابق البحث."
                              : "لا توجد هدايا للعرض."}
                          </td>
                        </tr>
                      ) : (
                        giftListTableRows.map((p, i) => (
                          <tr key={p.slug} className="border-t">
                            <td className="p-3">{i + 1}</td>
                            <td className="p-3 font-medium">{p.name}</td>
                            <td className="p-3">{p.sku}</td>
                            <td className="p-3 bg-brand-green-dark/5">
                              <Input
                                value={salePriceDrafts[p.slug] ?? ""}
                                onChange={(e) => setSalePriceDrafts((prev) => ({ ...prev, [p.slug]: e.target.value }))}
                                placeholder="مثال: 425"
                                className="min-h-[44px]"
                                aria-label={`سعر المبيع ${p.name}`}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={priceDrafts[p.slug] ?? ""}
                                onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [p.slug]: e.target.value }))}
                                placeholder="مثال: 350"
                                className="min-h-[44px]"
                                aria-label={`السعر ${p.name}`}
                              />
                            </td>
                            <td className="p-3">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="min-h-[44px] w-full"
                                onClick={() => void saveProductPrice(p.slug)}
                                disabled={savingSlug === p.slug || loadingProducts}
                              >
                                {savingSlug === p.slug ? "جاري الحفظ..." : "حفظ"}
                              </Button>
                            </td>
                            <td className="p-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="min-h-[44px]"
                                onClick={() => {
                                  setAdminTab("gift-pricing");
                                  addQuoteLine(p.slug);
                                }}
                                disabled={quoteLines.some((x) => x.kind === "product" && x.slug === p.slug)}
                              >
                                <Plus className="ml-2 h-4 w-4" /> إضافة
                              </Button>
                            </td>
                            <td className="p-3">
                              <Input
                                value={detailDrafts[p.slug] ?? ""}
                                onChange={(e) => setDetailDrafts((prev) => ({ ...prev, [p.slug]: e.target.value }))}
                                placeholder="65+25"
                                className="min-h-[40px] text-xs"
                                aria-label={`تفصيل ${p.name}`}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {giftListQuery.trim() ? (
                    <>
                      نتائج البحث: {giftListFiltered.length} هدية
                      {giftListFiltered.length > 200 ? " (يُعرض أول 200)" : ""}.
                    </>
                  ) : giftListFiltered.length > 200 ? (
                    <>يُعرض أول 200 من {giftListFiltered.length} هدية. استخدم البحث أعلاه للوصول السريع.</>
                  ) : (
                    <>{giftListFiltered.length} هدية. استخدم البحث أعلاه للوصول السريع.</>
                  )}{" "}
                  زر «إضافة» ينقلك إلى تبويب تسعير الهدايا.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={previewInvoice != null} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>معاينة الفاتورة {previewInvoice?.invoiceNo ?? ""}</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">التاريخ </span>
                  {new Date(previewInvoice.createdAt).toLocaleString("ar-SY")}
                </div>
                <div>
                  <span className="text-muted-foreground">العملة </span>
                  {previewInvoice.currency === "USD" ? "USD" : "ل.س"}
                </div>
                <div>
                  <span className="text-muted-foreground">السداد </span>
                  {previewInvoice.paymentTerms === "deferred" ? "مؤجل" : "نقدي"}
                </div>
                <div>
                  <span className="text-muted-foreground">المجموع </span>
                  <span className="font-semibold tabular-nums">{previewInvoice.grandTotalText}</span>
                </div>
                {previewInvoice.usdRate && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">سعر الصرف </span>
                    {previewInvoice.usdRate}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">الجهة </span>
                  {previewInvoice.toSir || "—"}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">البيان </span>
                  {previewInvoice.statement || "—"}
                </div>
              </div>
              <div className="overflow-x-auto rounded border">
                <table className="w-full min-w-[520px] text-right text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">الاسم</th>
                      <th className="p-2">العدد</th>
                      <th className="p-2">سعر</th>
                      <th className="p-2">قيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewInvoice.lines.map((ln, i) => (
                      <tr key={`${i}-${ln.sku}`} className="border-t">
                        <td className="p-2">{ln.sku}</td>
                        <td className="p-2 font-medium">{ln.name}</td>
                        <td className="p-2 tabular-nums">{ln.qty}</td>
                        <td className="p-2 tabular-nums">{ln.unitPriceText}</td>
                        <td className="p-2 tabular-nums">{ln.lineValueText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
