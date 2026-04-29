"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Edit, Trash2, Search, LogOut, Download, Upload, BarChart3, ClipboardList, FileText, QrCode, DownloadCloud, RefreshCw, AlertTriangle, RotateCcw, Printer, Eye, EyeOff, Sheet, Warehouse, Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product, getGiftTierLabel } from "@/data/products";
import { getStoredOrders, saveStoredOrders, type OrderRecord } from "@/types/order";
import type { DashboardViewReturnProps } from "./dashboard-view-return";
import { productPageUrl } from "@/lib/site-url";
import { siteConfig } from "@/lib/config";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { safeLocalStorageRemoveItem } from "@/lib/browser-storage";

export function DashboardViewBody(props: DashboardViewReturnProps) {
  const confirm = useConfirm();
  const {
    products,
    searchQuery,
    setSearchQuery,
    dashboardTab,
    setDashboardTab,
    orders,
    reportMonth,
    setReportMonth,
    reportType,
    setReportType,
    reportQuarter,
    setReportQuarter,
    reportYear,
    setReportYear,
    reportLoading,
    orderSearchQuery,
    setOrderSearchQuery,
    visitCount,
    lowStockProducts,
    LOW_STOCK_THRESHOLD,
    ordersForPeriod,
    periodLabel,
    ordersDisplayed,
    last6Months,
    maxOrdersMonth,
    byRequester,
    maxByRequester,
    filteredProducts,
    handleAddProduct,
    handleEditProduct,
    handleDeleteProduct,
      handleToggleHidden,
    handleExportGiftsExcel,
    handleImportGiftsExcel,
    giftsExcelImporting,
    handleBackup,
    handleRestore,
    handleDownloadReport,
    refreshOrders,
    refetchProducts,
    handleLogout,
  } = props;

  const [siteOrigin, setSiteOrigin] = React.useState("");
  const [catalogPdfLoading, setCatalogPdfLoading] = React.useState(false);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  const handleDownloadCatalogPdfQtyQr = async () => {
    if (catalogPdfLoading) return;
    if (products.length === 0) {
      notifyInfo("لا توجد هدايا في القائمة.");
      return;
    }
    setCatalogPdfLoading(true);
    try {
      const { downloadFullCatalogWithQuantityAndQr } = await import("@/lib/catalog-pdf");
      await downloadFullCatalogWithQuantityAndQr(products, siteConfig);
    } catch (e) {
      console.error(e);
      notifyError("تعذر إنشاء كتالوج PDF. تحقق من الاتصال أو حاول لاحقاً.");
    } finally {
      setCatalogPdfLoading(false);
    }
  };

  /** للتجريب: مسح نسخة بيانات الهدايا المحلية وإعادة تحميل الصفحة بالكامل (لا يمس جلسة الدخول) */
  const handleDashboardRestart = async () => {
    const ok = await confirm({
      title: "إعادة تشغيل اللوحة",
      message:
        "سيتم مسح نسخة بيانات الهدايا المخبأة في المتصفح وإعادة تحميل الصفحة لجلب بيانات جديدة من الخادم.\n(طلباتك المحلية في الطلبات لا تُحذف.)",
      confirmLabel: "متابعة",
      cancelLabel: "إلغاء",
    });
    if (!ok) return;
    try {
      safeLocalStorageRemoveItem("products");
    } catch {
      //
    }
    window.location.reload();
  };

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const thisMonthOrders = orders.filter((o) => {
    const ym = o.date ? o.date.slice(0, 7) : o.createdAt?.slice(0, 7);
    return ym === currentMonth;
  });
  const thisMonthPieces = thisMonthOrders.reduce((s, o) => s + (o.totalPieces ?? 0), 0);

  type QuoteLine = { slug: string; qty: number };
  const [adminQuery, setAdminQuery] = React.useState("");
  const [quoteLines, setQuoteLines] = React.useState<QuoteLine[]>([]);
  const [quotePdfLoading, setQuotePdfLoading] = React.useState(false);

  const parsePriceNumber = (raw: unknown): number => {
    const s = String(raw ?? "").trim();
    if (!s) return 0;
    // keep digits and dot/comma
    const cleaned = s.replace(/[^\d.,]/g, "").replace(/,/g, "");
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  };

  const formatMoney = (n: number): string => {
    const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    return v.toLocaleString("ar-SA");
  };

  const bySlug = React.useMemo(() => new Map(products.map((p) => [p.slug, p] as const)), [products]);
  const adminSearchLower = adminQuery.trim().toLowerCase();
  const adminSearchResults = React.useMemo(() => {
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

  const quoteComputed = React.useMemo(() => {
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
          unitPriceText: (p.price ?? "").trim() || "—",
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
      notifyInfo("أضف هدية واحدة على الأقل للحساب.");
      return;
    }
    setQuotePdfLoading(true);
    try {
      const { generateAdminQuoteBlob } = await import("@/lib/admin-quote-pdf");
      const blob = await generateAdminQuoteBlob({
        title: "الإدارة — تسعير الهدايا",
        subtitle: "السعر الفردي + الكمية + الإجمالي",
        lines: quoteComputed.lines.map((l) => ({
          name: l.name,
          unitPriceText: l.unitPriceText,
          quantity: l.qty,
          lineTotalText: l.unitNum > 0 ? formatMoney(l.totalNum) : "—",
        })),
        grandTotalText: formatMoney(quoteComputed.grand),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تسعير-الهدايا-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      notifyError("تعذر إنشاء PDF للأسعار.");
    } finally {
      setQuotePdfLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-full overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8 pb-safe">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold sm:mb-2 sm:text-3xl">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground sm:text-base">إدارة الهدايا المعروضة</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <Link href="/scan" className="min-w-0">
            <Button variant="outline" size="lg" className="min-h-[44px] w-full touch-manipulation sm:w-auto">
              <QrCode className="ml-2 h-5 w-5 shrink-0" />
              <span className="truncate">مسح الهدايا</span>
            </Button>
          </Link>
          <Link href="/dashboard/qr-codes" className="min-w-0">
            <Button variant="outline" size="lg" className="min-h-[44px] w-full touch-manipulation sm:w-auto">
              <DownloadCloud className="ml-2 h-5 w-5 shrink-0" />
              <span className="truncate">رموز QR</span>
            </Button>
          </Link>
          <Button onClick={handleAddProduct} size="lg" className="min-h-[44px] w-full touch-manipulation sm:w-auto col-span-2 sm:col-span-1">
            <Plus className="ml-2 h-5 w-5 shrink-0" />
            إضافة هدية جديدة
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-[44px] w-full touch-manipulation sm:w-auto col-span-2 sm:col-span-1 border-dashed"
            onClick={() => void handleDashboardRestart()}
            title="مسح كاش بيانات الهدايا وإعادة تحميل الصفحة — مفيد أثناء التجريب"
          >
            <RotateCcw className="ml-2 h-5 w-5 shrink-0" />
            ريستارت اللوحة
          </Button>
          <Button variant="outline" size="icon" onClick={handleLogout} title="تسجيل الخروج" className="min-h-[44px] min-w-[44px] touch-manipulation col-span-2 sm:col-span-1">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">تسجيل الخروج</span>
          </Button>
        </div>
      </div>

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="flex flex-row flex-wrap items-center justify-around gap-4 px-4 py-5 sm:px-6 sm:py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">طلبات هذا الشهر</p>
            <p className="text-2xl font-bold text-primary">{thisMonthOrders.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">إجمالي القطع هذا الشهر</p>
            <p className="text-2xl font-bold text-primary">{thisMonthPieces}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex border-b">
        <button
          type="button"
          onClick={() => setDashboardTab("products")}
          className={`flex-1 min-h-[44px] px-4 py-2 font-medium transition-colors touch-manipulation flex items-center justify-center ${dashboardTab === "products" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          الهدايا
        </button>
        <button
          type="button"
          onClick={() => setDashboardTab("admin")}
          className={`flex-1 min-h-[44px] px-4 py-2 font-medium transition-colors touch-manipulation flex items-center justify-center gap-1 ${dashboardTab === "admin" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Calculator className="h-4 w-4 shrink-0" />
          الإدارة
        </button>
        <button
          type="button"
          onClick={() => { setDashboardTab("orders"); refreshOrders(); }}
          className={`flex-1 min-h-[44px] px-4 py-2 font-medium transition-colors touch-manipulation flex items-center justify-center gap-1 ${dashboardTab === "orders" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          الطلبات
        </button>
      </div>

      {dashboardTab === "orders" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                الطلبات المسجلة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as "month" | "quarter" | "year")}
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-auto sm:min-w-[120px]"
                >
                  <option value="month">شهري</option>
                  <option value="quarter">ربع سنوي</option>
                  <option value="year">سنوي</option>
                </select>
                {reportType === "month" && (
                  <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground">الشهر:</span>
                    <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-auto" />
                  </label>
                )}
                {reportType === "quarter" && (
                  <>
                    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">السنة:</span>
                      <input type="number" min={2020} max={2030} value={reportQuarter.split("-")[0]} onChange={(e) => setReportQuarter(`${e.target.value}-${reportQuarter.split("-")[1] || 1}`)} className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-24" />
                    </label>
                    <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">الربع:</span>
                      <select value={reportQuarter.split("-")[1]} onChange={(e) => setReportQuarter(`${reportQuarter.split("-")[0]}-${e.target.value}`)} className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-auto">
                        <option value="1">الأول (يناير–مارس)</option>
                        <option value="2">الثاني (أبريل–يونيو)</option>
                        <option value="3">الثالث (يوليو–سبتمبر)</option>
                        <option value="4">الرابع (أكتوبر–ديسمبر)</option>
                      </select>
                    </label>
                  </>
                )}
                {reportType === "year" && (
                  <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground">السنة:</span>
                    <input type="number" min={2020} max={2030} value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-24" />
                  </label>
                )}
                <Button variant="default" size="sm" className="min-h-[44px] w-full sm:w-auto touch-manipulation" onClick={handleDownloadReport} disabled={ordersForPeriod.length === 0 || reportLoading}>
                  <FileText className="ml-2 h-4 w-4" />
                  {reportLoading ? "جاري التصدير..." : "تحميل تقرير PDF"}
                </Button>
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={() => {
                  const rows = ordersForPeriod.map((o, i) => {
                    const gifts = (o.items ?? []).map((it) => `${it.name} (${it.quantity})`).join(" - ");
                    return [i + 1, o.date ?? "", o.requesterName ?? "", gifts, o.totalPieces ?? 0, (o.notes ?? "").replace(/\s+/g, " ")];
                  });
                  const header = ["رقم", "التاريخ", "الجهة الطالبة", "الهدايا", "القطع", "ملاحظات"];
                  const csv = "\uFEFF" + [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\r\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `طلبات-${periodLabel.replace(/\s+/g, "-")}.csv`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }} disabled={ordersForPeriod.length === 0}>
                  <Download className="ml-2 h-4 w-4" /> تصدير CSV
                </Button>
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={() => {
                  const data = getStoredOrders();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `orders-backup-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}>
                  <Download className="ml-2 h-4 w-4" /> تصدير نسخة احتياطية
                </Button>
                <label className="inline-flex cursor-pointer min-h-[44px]">
                  <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const inputEl = e.target;
                    const reader = new FileReader();
                    reader.onload = () => {
                      void (async () => {
                        try {
                          const parsed = JSON.parse(reader.result as string) as OrderRecord[];
                          if (!Array.isArray(parsed)) {
                            notifyError("الملف يجب أن يحتوي مصفوفة طلبات.");
                            return;
                          }
                          const ok = await confirm({
                            title: "استعادة الطلبات",
                            message: `سيتم استبدال ${orders.length} طلبية حالية بـ ${parsed.length} طلبية من الملف.\nهل تريد المتابعة؟`,
                            confirmLabel: "استعادة",
                            cancelLabel: "إلغاء",
                            danger: true,
                          });
                          if (!ok) return;
                          saveStoredOrders(parsed);
                          refreshOrders();
                          notifySuccess("تم استعادة الطلبات بنجاح.");
                        } catch {
                          notifyError("ملف غير صالح.");
                        } finally {
                          inputEl.value = "";
                        }
                      })();
                    };
                    reader.readAsText(file);
                  }} />
                  <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer min-h-[44px]">
                    <Upload className="ml-2 h-4 w-4" /> استعادة من نسخة
                  </span>
                </label>
              </div>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input type="text" placeholder="بحث في الطلبات (الجهة، الرقم المرجعي، التاريخ، ملاحظات)..." value={orderSearchQuery} onChange={(e) => setOrderSearchQuery(e.target.value)} className="pr-10 min-h-[44px] text-base touch-manipulation mt-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                عدد الطلبات في {periodLabel}: {ordersDisplayed.length}
                {orderSearchQuery.trim() ? ` (مطابقة للبحث من ${ordersForPeriod.length})` : ""} — إجمالي القطع: {ordersDisplayed.reduce((s, o) => s + (o.totalPieces ?? 0), 0)}
              </p>
              <div className="overflow-x-auto rounded-md border -mx-3 sm:mx-0 overflow-y-visible" style={{ WebkitOverflowScrolling: "touch" }}>
                <table className="w-full min-w-[640px] text-right text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 sm:p-3 w-10">#</th>
                      <th className="p-2 sm:p-3 w-28">التاريخ</th>
                      <th className="p-2 sm:p-3 min-w-[120px]">الجهة الطالبة</th>
                      <th className="p-2 sm:p-3 min-w-[180px]">الهدايا</th>
                      <th className="p-2 sm:p-3 w-16">القطع</th>
                      <th className="p-2 sm:p-3 max-w-[160px]">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersDisplayed.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">{orderSearchQuery.trim() ? "لا توجد نتائج تطابق البحث" : "لا توجد طلبات في الفترة المحددة"}</td></tr>
                    ) : (
                      ordersDisplayed.map((o, i) => {
                        const isToday = o.date === new Date().toISOString().slice(0, 10);
                        const isThisMonth = (o.date?.slice(0, 7) ?? o.createdAt?.slice(0, 7)) === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
                        return (
                          <tr key={o.id} className={`border-t align-top ${isToday ? "bg-green-50 dark:bg-green-950/20" : isThisMonth ? "bg-primary/5" : ""}`}>
                            <td className="p-2 sm:p-3">{i + 1}</td>
                            <td className="p-2 sm:p-3">
                              <span className="inline-block">{o.date}</span>
                              {isToday && <Badge variant="default" className="mr-1 text-xs bg-green-600">اليوم</Badge>}
                              {!isToday && isThisMonth && <Badge variant="secondary" className="mr-1 text-xs">هذا الشهر</Badge>}
                            </td>
                            <td className="p-2 sm:p-3">{o.requesterName || "—"}</td>
                            <td className="p-2 sm:p-3">
                              {o.items?.length ? (
                                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                                  {o.items.map((it, idx) => (<li key={idx}>{it.name} ({it.quantity})</li>))}
                                </ul>
                              ) : "—"}
                            </td>
                            <td className="p-2 sm:p-3">{o.totalPieces ?? 0}</td>
                            <td className="p-2 sm:p-3 max-w-[160px] truncate">{o.notes || "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                إحصائيات بصرية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">طلبات آخر 6 أشهر</p>
                <div className="space-y-2">
                  {last6Months.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="w-20 text-sm shrink-0">{m.label}</span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden min-w-[60px]">
                        <div className="h-full bg-primary rounded transition-all duration-300" style={{ width: `${(m.count / maxOrdersMonth) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8">{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">توزيع الطلبات حسب الجهة الطالبة</p>
                <div className="space-y-2">
                  {byRequester.map((r) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="flex-1 text-sm truncate max-w-[140px]" title={r.name}>{r.name}</span>
                      <div className="flex-1 h-5 bg-muted rounded overflow-hidden min-w-[40px] max-w-[200px]">
                        <div className="h-full bg-primary/80 rounded transition-all duration-300" style={{ width: `${(r.count / maxByRequester) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-6">{r.count}</span>
                    </div>
                  ))}
                  {byRequester.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات مسجلة</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {dashboardTab === "admin" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                الإدارة — تسعير الهدايا
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ابحث عن هدية وأضفها للحساب، ثم حدّد الكمية لتحصل على الإجمالي ويمكنك تحميل PDF.
              </p>

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
                                  <Badge variant="outline">السعر: {p.price ?? "—"}</Badge>
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
                                <td className="p-3 tabular-nums">
                                  {l.unitNum > 0 ? formatMoney(l.totalNum) : "—"}
                                </td>
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
                          <th className="p-3 w-28">السعر</th>
                          <th className="p-3 w-20">إضافة</th>
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
                              <td className="p-3">{p.price ?? "—"}</td>
                              <td className="p-3">
                                <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => addQuoteLine(p.slug)} disabled={quoteLines.some((x) => x.slug === p.slug)}>
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
        </>
      )}

      {dashboardTab === "products" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                إحصائيات وأدوات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                <div><span className="text-muted-foreground">عدد الهدايا:</span> <span className="mr-2 font-bold text-lg">{products.length}</span></div>
                <div><span className="text-muted-foreground">عدد زيارات الصفحة الرئيسية:</span> <span className="mr-2 font-bold text-lg">{visitCount}</span> <span className="text-muted-foreground text-xs">(هذا المتصفح)</span></div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/art-inventory" className="min-w-0">
                  <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation w-full sm:w-auto">
                    <Warehouse className="ml-2 h-4 w-4" /> جرد الإنتاج الفني
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] touch-manipulation"
                  onClick={() => {
                    void refetchProducts(false);
                  }}
                  title="تحديث الأعداد من قاعدة البيانات"
                >
                  <RefreshCw className="ml-2 h-4 w-4" /> تحديث القائمة
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="min-h-[44px] touch-manipulation bg-brand-green-dark hover:bg-brand-green-darker"
                  onClick={() => {
                    void handleDownloadCatalogPdfQtyQr();
                  }}
                  disabled={catalogPdfLoading || products.length === 0}
                  aria-busy={catalogPdfLoading}
                  title="PDF يتضمن الكمية المتوفرة ورموز QR تفتح صفحة كل هدية على الموقع"
                >
                  <Printer className="ml-2 h-4 w-4" />
                  {catalogPdfLoading ? "جاري إنشاء PDF..." : "كتالوج PDF (الكمية + QR)"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] touch-manipulation"
                  onClick={() => {
                    if (typeof handleExportGiftsExcel === "function") {
                      void (handleExportGiftsExcel as () => Promise<void>)();
                    }
                  }}
                  title="تصدير ملف Excel منظم للهدايا"
                >
                  <Sheet className="ml-2 h-4 w-4" /> تصدير بيانات الهدايا
                </Button>
                <label
                  className={`inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] px-4 cursor-pointer touch-manipulation ${giftsExcelImporting ? "pointer-events-none opacity-60" : ""}`}
                  title="استيراد ملف Excel بنفس أعمدة التصدير — يُحدَّث حقل الكمية فقط حسب «الكمية الحالية» ومطابقة «كود المنتج»"
                >
                  <Upload className="ml-2 h-4 w-4" />
                  {giftsExcelImporting ? "جاري الاستيراد..." : "استيراد Excel (الكميات)"}
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    disabled={giftsExcelImporting}
                    onChange={(ev) => {
                      if (typeof handleImportGiftsExcel === "function") {
                        void Promise.resolve(handleImportGiftsExcel(ev));
                      }
                    }}
                  />
                </label>
                <Button variant="outline" size="sm" className="min-h-[44px] touch-manipulation" onClick={handleBackup}>
                  <Download className="ml-2 h-4 w-4" /> تحميل نسخة احتياطية
                </Button>
                <label className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] px-4 cursor-pointer touch-manipulation">
                  <Upload className="ml-2 h-4 w-4" /> استعادة من ملف
                  <input type="file" accept=".json,application/json" className="hidden" onChange={handleRestore} />
                </label>
              </div>
            </CardContent>
          </Card>

          {lowStockProducts.length > 0 && (
            <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-base">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  هدايا تحتاج إعادة تخزين (الكمية ≤ {LOW_STOCK_THRESHOLD})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {lowStockProducts.map((p) => (
                    <li key={p.slug}>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-200">
                        {p.name} — العدد: {p.availableQuantity ?? 0}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardContent className="pt-6 px-4 sm:px-6">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input type="text" placeholder="ابحث عن هدية..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10 min-h-[44px] text-base touch-manipulation" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const isLowStock = !product.archived && (product.availableQuantity ?? 0) <= LOW_STOCK_THRESHOLD;
              return (
                <Card key={product.slug} className={`overflow-hidden break-inside-avoid ${isLowStock ? "border-amber-400 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800" : ""}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-border bg-white dark:bg-muted sm:h-20 sm:w-20">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                            unoptimized={
                              product.images[0].includes("/archive-images/") ||
                              product.images[0].startsWith("http")
                            }
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] leading-tight text-muted-foreground">
                            بدون صورة
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="mb-2 text-xl">{product.name}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">كود: {product.sku}</Badge>
                          <Badge variant="outline">العدد: {product.availableQuantity ?? 0}</Badge>
                          {product.hidden && (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                              مخفي عن الموقع
                            </Badge>
                          )}
                          {!product.archived && (product.availableQuantity ?? 0) <= LOW_STOCK_THRESHOLD && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-200">يحتاج إعادة تخزين</Badge>
                          )}
                          {product.archived && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">الكمية منتهية</Badge>
                          )}
                          <Badge variant={product.giftTier === "luxury" ? "default" : "outline"} className={product.giftTier === "luxury" ? "bg-brand-gold text-white" : ""}>
                            {getGiftTierLabel(product.giftTier)}
                          </Badge>
                        </div>
                      </div>
                      <a
                        href={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                          siteOrigin ? productPageUrl(siteOrigin, product.slug) : product.sku
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded border border-border bg-white p-1.5 shadow-sm hover:shadow-md transition-shadow"
                        title={siteOrigin ? "رمز QR يفتح صفحة الهدية على الموقع" : "رمز QR (يُحدَّث لرابط الصفحة بعد التحميل)"}
                      >
                        <Image
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=88x88&data=${encodeURIComponent(
                            siteOrigin ? productPageUrl(siteOrigin, product.slug) : product.sku
                          )}`}
                          alt={`QR ${product.name}`}
                          width={88}
                          height={88}
                          className="block rounded"
                        />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>
                    <div className="mb-4 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">المحتويات:</span>
                        <ul className="mt-1 list-inside list-disc space-y-1">
                          {(product.contents ?? []).slice(0, 3).map((item, idx) => (<li key={idx}>{item}</li>))}
                          {(product.contents ?? []).length > 3 && (
                            <li className="text-xs">+{(product.contents ?? []).length - 3} أكثر</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        variant="outline"
                        className="min-h-[44px] flex-1 touch-manipulation"
                        onClick={() => {
                          if (typeof handleToggleHidden === "function") {
                            void handleToggleHidden(product.slug, !product.hidden);
                          }
                        }}
                        title={product.hidden ? "إظهار الهدية على الموقع الرسمي" : "إخفاء الهدية عن الموقع الرسمي"}
                      >
                        {product.hidden ? (
                          <>
                            <Eye className="ml-2 h-4 w-4 shrink-0" /> إظهار
                          </>
                        ) : (
                          <>
                            <EyeOff className="ml-2 h-4 w-4 shrink-0" /> إخفاء
                          </>
                        )}
                      </Button>
                      <Button variant="outline" className="min-h-[44px] flex-1 touch-manipulation" onClick={() => handleEditProduct(product)}>
                        <Edit className="ml-2 h-4 w-4 shrink-0" /> تعديل
                      </Button>
                      <Button variant="destructive" className="min-h-[44px] flex-1 touch-manipulation" onClick={() => handleDeleteProduct(product.slug)}>
                        <Trash2 className="ml-2 h-4 w-4 shrink-0" /> حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                {searchQuery ? "لم يتم العثور على هدايا تطابق البحث" : "لا توجد هدايا"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
