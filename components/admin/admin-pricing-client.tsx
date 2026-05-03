"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, FileText, LogOut, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";

type QuoteLine = { slug: string; qty: number };

function parsePriceNumber(raw: unknown): number {
  const s = String(raw ?? "").trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^\d.,]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function formatMoney(n: number): string {
  const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  return v.toLocaleString("ar-SA");
}

/** عرض «ل.س» في واجهة الإدارة حتى لو كان السعر المخزّن يحتوي «ر.س». */
function normalizeSypCurrencyLabel(raw: string): string {
  return String(raw).replace(/ر\.س/g, "ل.س");
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
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

export function AdminPricingClient() {
  const [gateOk, setGateOk] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [adminQuery, setAdminQuery] = useState("");
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [quotePdfLoading, setQuotePdfLoading] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

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
  const [pdfCurrency, setPdfCurrency] = useState<"SYP" | "USD">("SYP");
  const [usdRate, setUsdRate] = useState("15000");

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

  useEffect(() => {
    void checkGate();
  }, [checkGate]);

  useEffect(() => {
    if (gateOk) void fetchProducts();
  }, [gateOk, fetchProducts]);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p] as const)), [products]);

  useEffect(() => {
    setPriceDrafts((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const p of products) {
        if (next[p.slug] === undefined) {
          next[p.slug] = normalizeSypCurrencyLabel(String(p.price ?? ""));
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

  const addQuoteLine = (slug: string) => {
    setQuoteLines((prev) => {
      const found = prev.find((x) => x.slug === slug);
      if (found) return prev.map((x) => (x.slug === slug ? { ...x, qty: Math.min(999999, (x.qty ?? 0) + 1) } : x));
      return [...prev, { slug, qty: 1 }];
    });
  };

  const removeQuoteLine = (slug: string) => setQuoteLines((prev) => prev.filter((x) => x.slug !== slug));
  const setQuoteQty = (slug: string, value: string) => {
    const v = Math.max(0, Math.min(999999, Math.floor(Number(value.replace(/[^\d]/g, "")) || 0)));
    setQuoteLines((prev) => prev.map((x) => (x.slug === slug ? { ...x, qty: v } : x)));
  };

  const quoteComputed = useMemo(() => {
    const lines = quoteLines
      .map((l) => {
        const p = bySlug.get(l.slug);
        if (!p) return null;
        const qty = Math.max(0, Math.floor(l.qty ?? 0));
        const unitNum = parsePriceNumber(p.price);
        const totalNum = unitNum * qty;
        return {
          slug: l.slug,
          sku: p.sku,
          name: p.name,
          unitPriceText: normalizeSypCurrencyLabel((p.price ?? "").trim()) || "—",
          unitNum,
          qty,
          totalNum,
        };
      })
      .filter(Boolean) as {
      slug: string;
      sku: string;
      name: string;
      unitPriceText: string;
      unitNum: number;
      qty: number;
      totalNum: number;
    }[];
    const grand = lines.reduce((s, x) => s + (x.totalNum ?? 0), 0);
    return { lines, grand };
  }, [quoteLines, bySlug]);

  const downloadQuotePdf = async () => {
    if (quotePdfLoading) return;
    if (quoteComputed.lines.length === 0) {
      toast.message("أضف هدية واحدة على الأقل للحساب.");
      return;
    }
    const rate = Number(String(usdRate).replace(/[^\d.]/g, ""));
    if (pdfCurrency === "USD" && (!Number.isFinite(rate) || rate <= 0)) {
      toast.error("أدخل سعر صرف صالح (ليرة سورية للدولار الواحد) لتصدير الملف بالدولار.");
      return;
    }
    setQuotePdfLoading(true);
    try {
      const { generateAdminQuoteBlob } = await import("@/lib/admin-quote-pdf");
      type PdfLine = {
        sku: string;
        name: string;
        unit: string;
        unitPriceText: string;
        lineValueText: string;
      };
      const pdfLines: PdfLine[] = [];
      let running = 0;

      for (const l of quoteComputed.lines) {
        const qty = Math.max(0, Math.floor(l.qty));
        const unitSyp = l.unitNum;
        const unitLabel = "قطعة";

        if (pdfCurrency === "SYP") {
          const unitP = Math.floor(unitSyp);
          const lineVal = unitP * qty;
          running += lineVal;
          const sypNum = (v: number) => v.toLocaleString("ar-SA", { numberingSystem: "arab" });
          pdfLines.push({
            sku: l.sku || "—",
            name: l.name,
            unit: unitLabel,
            unitPriceText: unitP > 0 ? `${sypNum(unitP)} ل.س` : "—",
            lineValueText: unitP > 0 ? `${sypNum(lineVal)} ل.س` : "—",
          });
        } else {
          const unitUsd = unitSyp > 0 ? round2(unitSyp / rate) : 0;
          const lineVal = unitSyp > 0 ? round2((unitSyp * qty) / rate) : 0;
          running = round2(running + lineVal);
          pdfLines.push({
            sku: l.sku || "—",
            name: l.name,
            unit: unitLabel,
            unitPriceText: unitSyp > 0 ? `${unitUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : "—",
            lineValueText: unitSyp > 0 ? `${lineVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : "—",
          });
        }
      }

      const grandTotalText =
        pdfCurrency === "SYP"
          ? `${Math.floor(running).toLocaleString("ar-SA", { numberingSystem: "arab" })} ل.س`
          : `${running.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

      const currencyNote =
        pdfCurrency === "SYP"
          ? "الليرة السورية"
          : `الدولار الأمريكي (تحويل من الليرة بسعر ${rate.toLocaleString("ar-SA", { numberingSystem: "arab" })} ل.س للدولار الواحد)`;

      const blob = await generateAdminQuoteBlob({
        meta: {
          toSir: toSir.trim(),
          statement: statement.trim(),
          invoiceNo: invoiceNo.trim(),
          documentDateStr: formatInvoiceDateAr(invoiceDate),
          currencyNote,
        },
        lines: pdfLines,
        grandTotalText,
        grandNumericForWords: pdfCurrency === "SYP" ? Math.floor(running) : running,
        currency: pdfCurrency,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeInv = invoiceNo.trim().replace(/[^\w\u0600-\u06FF-]+/g, "_").slice(0, 40);
      a.download = `فاتورة-${safeInv || "عرض-أسعار"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("تعذر إنشاء PDF للأسعار.");
    } finally {
      setQuotePdfLoading(false);
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
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        toast.success("تم الدخول.");
        setPassword("");
        await checkGate();
        return;
      }
      toast.error(json.error || "كلمة المرور غير صحيحة");
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
    setSavingSlug(null);
    setToSir("");
    setStatement("");
    setPdfCurrency("SYP");
    setUsdRate("15000");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    const d = new Date();
    setInvoiceNo(`INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
    setGateOk(false);
    toast.message("تم الخروج.");
  };

  const saveProductPrice = async (slug: string) => {
    if (savingSlug) return;
    setSavingSlug(slug);
    try {
      const draft = (priceDrafts[slug] ?? "").trim();
      const res = await fetch("/api/admin/pricing/product-price", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, price: draft }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; data?: Product };
      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || "تعذر حفظ السعر.");
        return;
      }
      setProducts((prev) => prev.map((p) => (p.slug === slug ? json.data! : p)));
      setPriceDrafts((prev) => ({ ...prev, [slug]: normalizeSypCurrencyLabel(String(json.data!.price ?? "")) }));
      toast.success("تم حفظ السعر.");
    } catch {
      toast.error("حدث خطأ أثناء حفظ السعر.");
    } finally {
      setSavingSlug(null);
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
                الإدارة — تسجيل الدخول
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="admin-pricing-pass" className="mb-1 block text-sm font-medium">
                    كلمة المرور
                  </label>
                  <Input
                    id="admin-pricing-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-[44px]"
                    autoComplete="current-password"
                    required
                  />
                </div>
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
              <h1 className="mb-1 text-2xl font-bold sm:text-3xl">الإدارة — تسعير الهدايا</h1>
              <p className="text-sm text-muted-foreground sm:text-base">عرض الأسعار وحساب الإجمالي وتصدير PDF.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void fetchProducts()} disabled={loadingProducts}>
                {loadingProducts ? "جاري التحديث..." : "تحديث القائمة"}
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void handleLogout()}>
                <LogOut className="ml-2 h-4 w-4" />
                خروج
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                تسعير الهدايا
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ابحث عن هدية وأضفها للحساب، ثم حدّد الكمية لتحصل على الإجمالي ويمكنك تحميل PDF.
              </p>

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
                      إلى السيد
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
                        name="pdf-currency"
                        className="h-4 w-4"
                        checked={pdfCurrency === "SYP"}
                        onChange={() => setPdfCurrency("SYP")}
                      />
                      الليرة السورية
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="pdf-currency"
                        className="h-4 w-4"
                        checked={pdfCurrency === "USD"}
                        onChange={() => setPdfCurrency("USD")}
                      />
                      الدولار الأمريكي
                    </label>
                  </div>
                  {pdfCurrency === "USD" && (
                    <div>
                      <label htmlFor="usd-rate" className="mb-1 block text-sm text-muted-foreground">
                        سعر الصرف (ليرة سورية للدولار الواحد)
                      </label>
                      <Input
                        id="usd-rate"
                        inputMode="decimal"
                        value={usdRate}
                        onChange={(e) => setUsdRate(e.target.value)}
                        placeholder="مثال: 15000"
                        className="min-h-[44px] max-w-xs"
                      />
                    </div>
                  )}
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
                          const already = quoteLines.some((x) => x.slug === p.slug);
                          return (
                            <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <Badge variant="outline">كود: {p.sku}</Badge>
                                  <Badge variant="outline">السعر: {normalizeSypCurrencyLabel(String(p.price ?? "")) || "—"}</Badge>
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

              <Card>
                <CardHeader className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">حاسبة الأسعار</CardTitle>
                    <Button type="button" onClick={() => void downloadQuotePdf()} disabled={quotePdfLoading || quoteComputed.lines.length === 0} className="min-h-[44px]">
                      <FileText className="ml-2 h-4 w-4" />
                      {quotePdfLoading ? "جاري إنشاء PDF..." : "تحميل PDF"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {quoteComputed.lines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد هدايا ضمن الحاسبة بعد.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                        <table className="w-full min-w-[760px] text-right text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-3 w-10">#</th>
                              <th className="p-3">الهدية</th>
                              <th className="p-3 w-24">SKU</th>
                              <th className="p-3 w-28">السعر الفردي</th>
                              <th className="p-3 w-28">الكمية</th>
                              <th className="p-3 w-28">الإجمالي</th>
                              <th className="p-3 w-16">حذف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quoteComputed.lines.map((l, idx) => (
                              <tr key={l.slug} className="border-t align-middle">
                                <td className="p-3">{idx + 1}</td>
                                <td className="p-3 font-medium">{l.name}</td>
                                <td className="p-3">{l.sku || "—"}</td>
                                <td className="p-3">{l.unitPriceText || "—"}</td>
                                <td className="p-3">
                                  <Input
                                    value={String(l.qty)}
                                    onChange={(e) => setQuoteQty(l.slug, e.target.value)}
                                    inputMode="numeric"
                                    className="min-h-[44px] w-28 text-center tabular-nums"
                                  />
                                </td>
                                <td className="p-3 tabular-nums">{l.unitNum > 0 ? formatMoney(l.totalNum) : "—"}</td>
                                <td className="p-3">
                                  <Button type="button" variant="destructive" size="sm" className="min-h-[44px]" onClick={() => removeQuoteLine(l.slug)}>
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">حذف</span>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                        <div className="text-sm text-muted-foreground">المجموع النهائي</div>
                        <div className="text-lg font-bold tabular-nums">{formatMoney(quoteComputed.grand)}</div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">قائمة الهدايا والأسعار</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">عرض سريع للأسعار المخزنة داخل كل هدية.</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                    <table className="w-full min-w-[760px] text-right text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 w-10">#</th>
                          <th className="p-3">الهدية</th>
                          <th className="p-3 w-24">SKU</th>
                          <th className="p-3 min-w-[220px]">السعر</th>
                          <th className="p-3 w-28">حفظ</th>
                          <th className="p-3 w-28">إضافة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products
                          .filter((p) => !p.archived)
                          .slice(0, 200)
                          .map((p, i) => (
                            <tr key={p.slug} className="border-t">
                              <td className="p-3">{i + 1}</td>
                              <td className="p-3 font-medium">{p.name}</td>
                              <td className="p-3">{p.sku}</td>
                              <td className="p-3">
                                <Input
                                  value={priceDrafts[p.slug] ?? ""}
                                  onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [p.slug]: e.target.value }))}
                                  placeholder="مثال: 25000 ل.س"
                                  className="min-h-[44px]"
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
                                  onClick={() => addQuoteLine(p.slug)}
                                  disabled={quoteLines.some((x) => x.slug === p.slug)}
                                >
                                  <Plus className="ml-2 h-4 w-4" /> إضافة
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    تم عرض أول 200 هدية فقط لتجنب البطء. استخدم البحث لإضافة أي هدية بسرعة.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
