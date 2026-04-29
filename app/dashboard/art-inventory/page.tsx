"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileSpreadsheet, PackagePlus, RefreshCw, Search, Send, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ArtInventoryItem, ArtInventoryIssue } from "@/lib/art-inventory-db";

function clampText(s: string, max = 220): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

export default function ArtInventoryPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ArtInventoryItem[]>([]);
  const [issues, setIssues] = useState<ArtInventoryIssue[]>([]);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState("0");
  const [adding, setAdding] = useState(false);

  const [issueItemId, setIssueItemId] = useState<string>("");
  const [issueSearch, setIssueSearch] = useState("");
  const [issueQty, setIssueQty] = useState("1");
  const [issueEntity, setIssueEntity] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) router.replace("/login");
  }, [authOk, router]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [itemsRes, issuesRes] = await Promise.all([
        fetch("/api/art-inventory/items", { credentials: "include" }),
        fetch("/api/art-inventory/issues?limit=50", { credentials: "include" }),
      ]);
      const itemsJson = (await itemsRes.json()) as { success?: boolean; error?: string; items?: ArtInventoryItem[] };
      const issuesJson = (await issuesRes.json()) as { success?: boolean; error?: string; issues?: ArtInventoryIssue[] };
      if (itemsRes.status === 401 || issuesRes.status === 401) {
        toast.error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/art-inventory");
        return;
      }
      if (!itemsRes.ok || !itemsJson.success) {
        toast.error(itemsJson.error || "تعذر جلب الأصناف.");
      } else {
        setItems(Array.isArray(itemsJson.items) ? itemsJson.items : []);
      }
      if (!issuesRes.ok || !issuesJson.success) {
        // لا نوقف الصفحة لو فشل السجل
        setIssues([]);
      } else {
        setIssues(Array.isArray(issuesJson.issues) ? issuesJson.issues : []);
      }
    } catch {
      toast.error("حدث خطأ أثناء جلب البيانات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authOk) void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authOk]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.name} ${it.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const itemsById = useMemo(() => {
    const m = new Map<number, ArtInventoryItem>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const issueFilteredItems = useMemo(() => {
    const q = issueSearch.trim().toLowerCase();
    const base = q
      ? items.filter((it) => `${it.name} ${it.description ?? ""}`.toLowerCase().includes(q))
      : items;
    return base.slice(0, 12);
  }, [items, issueSearch]);

  const selectedIssueItem = issueItemId ? itemsById.get(Number(issueItemId)) : undefined;

  const totals = useMemo(() => {
    const count = items.length;
    const qty = items.reduce((s, it) => s + (it.currentQty ?? 0), 0);
    return { count, qty };
  }, [items]);

  const addItem = async () => {
    if (adding) return;
    const name = newName.trim();
    if (!name) {
      toast.error("اسم الصنف مطلوب.");
      return;
    }
    const qty = Math.max(0, Math.floor(Number(String(newQty).replace(/[^\d]/g, "")) || 0));
    setAdding(true);
    try {
      const res = await fetch("/api/art-inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description: newDesc.trim() || null, qty }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; item?: ArtInventoryItem };
      if (res.status === 401) {
        toast.error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/art-inventory");
        return;
      }
      if (res.ok && json.success && json.item) {
        toast.success("تمت إضافة الصنف.");
        setNewName("");
        setNewDesc("");
        setNewQty("0");
        setIssueItemId(String(json.item.id));
        setIssueSearch(json.item.name);
        await fetchAll();
      } else {
        toast.error(json.error || "تعذر إضافة الصنف.");
      }
    } catch {
      toast.error("حدث خطأ أثناء إضافة الصنف.");
    } finally {
      setAdding(false);
    }
  };

  const issue = async () => {
    if (issuing) return;
    const itemId = Math.max(1, Math.floor(Number(issueItemId || 0)));
    const qty = Math.max(0, Math.floor(Number(String(issueQty).replace(/[^\d]/g, "")) || 0));
    if (!itemId) {
      toast.error("اختر صنفاً.");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("الكمية يجب أن تكون أكبر من 0.");
      return;
    }
    setIssuing(true);
    try {
      const res = await fetch("/api/art-inventory/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemId,
          qty,
          entity: issueEntity.trim() || null,
          notes: clampText(issueNotes, 300) || null,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.status === 401) {
        toast.error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/art-inventory");
        return;
      }
      if (res.ok && json.success) {
        toast.success("تم التخريج بنجاح.");
        setIssueQty("1");
        setIssueEntity("");
        setIssueNotes("");
        setIssueSearch("");
        setIssueItemId("");
        await fetchAll();
      } else {
        toast.error(json.error || "تعذر التخريج.");
      }
    } catch {
      toast.error("حدث خطأ أثناء التخريج.");
    } finally {
      setIssuing(false);
    }
  };

  const importExcel = async (file: File) => {
    if (importing) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/art-inventory/import-excel", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = (await res.json()) as { success?: boolean; error?: string; importedRows?: number; upserted?: number };
      if (res.status === 401) {
        toast.error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        router.replace("/login?next=/dashboard/art-inventory");
        return;
      }
      if (res.ok && json.success) {
        toast.success(`تم استيراد ${json.importedRows ?? 0} صف (تحديث/إضافة: ${json.upserted ?? 0}).`);
        await fetchAll();
      } else {
        toast.error(json.error || "تعذر استيراد الملف.");
      }
    } catch {
      toast.error("حدث خطأ أثناء استيراد الملف.");
    } finally {
      setImporting(false);
    }
  };

  if (authOk === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }
  if (authOk === false) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="mb-2 text-3xl font-bold">جرد مكتب الإنتاج الفني</h1>
              <p className="text-muted-foreground">متابعة الأصناف، إضافة الجديد، وتخريج قطع للجهات مع سجل حركة.</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="min-h-[44px] shrink-0">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للوحة التحكم
              </Button>
            </Link>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  ملخص
                </CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" variant="outline" className="min-h-[44px]" onClick={fetchAll} disabled={loading}>
                    <RefreshCw className="ml-2 h-4 w-4" />
                    {loading ? "جاري التحديث..." : "تحديث"}
                  </Button>
                  <label
                    className={`inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground min-h-[44px] px-4 cursor-pointer ${
                      importing ? "pointer-events-none opacity-60" : ""
                    }`}
                    title="استيراد Excel بأعمدة: الصنف، الوصف، العدد الحالي (أو العدد + التخريج)"
                  >
                    <FileSpreadsheet className="ml-2 h-4 w-4" />
                    {importing ? "جاري الاستيراد..." : "استيراد Excel"}
                    <input
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      className="hidden"
                      disabled={importing}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        void importExcel(f);
                      }}
                    />
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              عدد الأصناف: <span className="font-semibold text-foreground">{totals.count}</span> — إجمالي القطع الحالية:{" "}
              <span className="font-semibold text-foreground tabular-nums">{totals.qty}</span>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PackagePlus className="h-5 w-5" />
                  إضافة صنف جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم الصنف" className="min-h-[44px]" />
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="الوصف (اختياري)" className="min-h-[44px]" />
                <Input
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="العدد"
                  inputMode="numeric"
                  className="min-h-[44px]"
                />
                <Button type="button" onClick={addItem} disabled={adding} className="min-h-[44px] w-full">
                  <PackagePlus className="ml-2 h-4 w-4" />
                  {adding ? "جاري الإضافة..." : "إضافة"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  تخريج (تسليم للجهات)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={issueSearch}
                    onChange={(e) => setIssueSearch(e.target.value)}
                    placeholder="ابحث عن الصنف بالاسم أو الوصف..."
                    className="min-h-[44px] pr-10"
                  />
                </div>
                {issueFilteredItems.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    <div className="divide-y">
                      {issueFilteredItems.map((it) => {
                        const selected = String(it.id) === issueItemId;
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => {
                              setIssueItemId(String(it.id));
                              setIssueSearch(it.name);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-right transition-colors hover:bg-muted ${
                              selected ? "bg-primary/10" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">{it.name}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {it.description || "بدون وصف"}
                              </div>
                            </div>
                            <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              المتوفر: {it.currentQty ?? 0}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <select
                  value={issueItemId}
                  onChange={(e) => setIssueItemId(e.target.value)}
                  className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                >
                  <option value="">اختر الصنف...</option>
                  {items.map((it) => (
                    <option key={it.id} value={String(it.id)}>
                      {it.name} ({it.currentQty ?? 0})
                    </option>
                  ))}
                </select>
                {selectedIssueItem && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-medium">{selectedIssueItem.name}</span>
                    <span className="text-muted-foreground"> — المتوفر حاليًا: </span>
                    <span className="tabular-nums">{selectedIssueItem.currentQty ?? 0}</span>
                    {selectedIssueItem.description ? (
                      <div className="mt-1 text-xs text-muted-foreground">{selectedIssueItem.description}</div>
                    ) : null}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={issueQty}
                    onChange={(e) => setIssueQty(e.target.value)}
                    placeholder="الكمية"
                    inputMode="numeric"
                    className="min-h-[44px]"
                  />
                  <Input
                    value={issueEntity}
                    onChange={(e) => setIssueEntity(e.target.value)}
                    placeholder="الجهة (اختياري)"
                    className="min-h-[44px]"
                  />
                </div>
                <Input
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="ملاحظات (اختياري)"
                  className="min-h-[44px]"
                />
                <Button type="button" onClick={issue} disabled={issuing} className="min-h-[44px] w-full">
                  <Send className="ml-2 h-4 w-4" />
                  {issuing ? "جاري التخريج..." : "تخريج"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">الأصناف</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث بالاسم أو الوصف..."
                className="min-h-[44px]"
              />
              {loading ? (
                <p className="text-muted-foreground">جاري تحميل البيانات...</p>
              ) : filtered.length === 0 ? (
                <p className="text-muted-foreground">لا توجد أصناف.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full min-w-[760px] text-right text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 w-14">#</th>
                        <th className="p-3">الصنف</th>
                        <th className="p-3">الوصف</th>
                        <th className="p-3 w-28">العدد الحالي</th>
                        <th className="p-3 w-28">العدد الأصلي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((it, idx) => (
                        <tr key={it.id} className="border-t">
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3 font-medium">{it.name}</td>
                          <td className="p-3 text-muted-foreground">{it.description || "—"}</td>
                          <td className="p-3 tabular-nums">{it.currentQty ?? 0}</td>
                          <td className="p-3 tabular-nums">{it.initialQty ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">سجل التخريج (آخر 50 حركة)</CardTitle>
            </CardHeader>
            <CardContent>
              {issues.length === 0 ? (
                <p className="text-muted-foreground">لا توجد حركات مسجلة بعد.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="w-full min-w-[760px] text-right text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 w-28">التاريخ</th>
                        <th className="p-3 w-20">الصنف</th>
                        <th className="p-3 w-24">الكمية</th>
                        <th className="p-3">الجهة</th>
                        <th className="p-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((it) => (
                        <tr key={it.id} className="border-t">
                          <td className="p-3 tabular-nums">{it.day}</td>
                          <td className="p-3">{itemsById.get(it.itemId)?.name ?? `#${it.itemId}`}</td>
                          <td className="p-3 tabular-nums">{it.qty}</td>
                          <td className="p-3">{it.entity || "—"}</td>
                          <td className="p-3 text-muted-foreground">{it.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">يعرض السجل اسم الصنف إذا كانت القائمة محمّلة.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

