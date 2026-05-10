"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, Loader2, Lock, Trash2, UserPlus } from "lucide-react";
import { DashboardLayout } from "@/app/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/lib/notify";

export function AdminDirectoryClient() {
  const [loading, setLoading] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [gateInput, setGateInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/directory/status", { credentials: "include" });
      const json = (await res.json()) as {
        success?: boolean;
        dbAvailable?: boolean;
        gateUnlocked?: boolean;
      };
      if (!res.ok) {
        notifyError("تعذر التحقق من الجلسة.");
        return;
      }
      setDbAvailable(!!json.dbAvailable);
      setGateUnlocked(!!json.gateUnlocked);
      if (json.gateUnlocked && json.dbAvailable) {
        const r2 = await fetch("/api/admin/directory", { credentials: "include" });
        const j2 = (await r2.json()) as { success?: boolean; emails?: string[] };
        if (r2.ok && j2.success && Array.isArray(j2.emails)) setEmails(j2.emails);
      }
    } catch {
      notifyError("خطأ في الشبكة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    try {
      const res = await fetch("/api/admin/directory/unlock", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gatePassword: gateInput }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        notifyError(json.error || "فشل فتح القفل");
        return;
      }
      notifySuccess("تم فتح القفل.");
      setGateInput("");
      await refreshStatus();
    } catch {
      notifyError("حدث خطأ");
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockAgain = async () => {
    try {
      await fetch("/api/admin/directory/lock", { method: "POST", credentials: "include" });
      notifySuccess("تم إغلاق القفل.");
      setGateUnlocked(false);
      setEmails([]);
    } catch {
      notifyError("تعذر إغلاق القفل");
    }
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = editEmail ?? newEmail.trim();
    const password = editEmail ? editPassword.trim() : newPassword.trim();
    if (!email || !password) {
      notifyError("أدخل البريد وكلمة المرور.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/directory", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        notifyError(json.error || "فشل الحفظ");
        return;
      }
      notifySuccess(editEmail ? "تم تحديث كلمة المرور." : "تمت إضافة الحساب.");
      setNewEmail("");
      setNewPassword("");
      setEditEmail(null);
      setEditPassword("");
      await refreshStatus();
    } catch {
      notifyError("حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`حذف الحساب ${email} من القاعدة؟`)) return;
    try {
      const res = await fetch(`/api/admin/directory?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        notifyError(json.error || "فشل الحذف");
        return;
      }
      notifySuccess("تم الحذف.");
      await refreshStatus();
    } catch {
      notifyError("حدث خطأ");
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-lg px-4 py-8 sm:max-w-xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة حسابات الدخول</h1>
            <p className="text-sm text-muted-foreground">
              إضافة وتعديل البريد وكلمة المرور (تُخزَّن مشفّرة في قاعدة البيانات)
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard" className="gap-2">
              <ArrowRight className="h-4 w-4 rotate-180" />
              لوحة التحكم
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {!dbAvailable && (
              <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="text-base">قاعدة البيانات غير متوفرة</CardTitle>
                  <CardDescription>
                    اربط Postgres (POSTGRES_URL أو DATABASE_URL على Vercel). بدون قاعدة بيانات لا تُخزَّن الحسابات من
                    هذه الصفحة، ولن يعمل إلا إن ضبطت ADMIN_CREDENTIALS أو ADMIN_BOOTSTRAP يدوياً في البيئة.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {!gateUnlocked ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    قفل الحماية
                  </CardTitle>
                  <CardDescription>
                    أدخل كلمة مرور القفل للمتابعة إلى إدارة الإيميلات وكلمات السر.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">كلمة مرور القفل</label>
                      <Input
                        type="password"
                        autoComplete="off"
                        value={gateInput}
                        onChange={(e) => setGateInput(e.target.value)}
                        placeholder="••••••••"
                        className="text-base"
                      />
                    </div>
                    <Button type="submit" disabled={unlocking || !gateInput.trim()} className="w-full sm:w-auto">
                      {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="ml-2 h-4 w-4" />}
                      فتح القفل
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-4 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleLockAgain()}>
                    <Lock className="ml-2 h-4 w-4" />
                    إغلاق القفل
                  </Button>
                </div>

                {dbAvailable && (
                  <>
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <UserPlus className="h-5 w-5" />
                          إضافة حساب جديد
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleAddOrUpdate} className="grid gap-3 sm:grid-cols-2">
                          <Input
                            type="email"
                            placeholder="البريد الإلكتروني"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            disabled={!!editEmail}
                            autoComplete="off"
                          />
                          <Input
                            type="password"
                            placeholder="كلمة المرور"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={!!editEmail}
                            autoComplete="new-password"
                          />
                          <div className="sm:col-span-2">
                            <Button type="submit" disabled={saving || !!editEmail || !newEmail.trim() || !newPassword}>
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">الحسابات في القاعدة</CardTitle>
                        <CardDescription>
                          الحسابات المعرّفة فقط عبر متغيرات البيئة لا تظهر هنا؛ عدّلها من إعدادات الاستضافة.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {emails.length === 0 ? (
                          <p className="text-sm text-muted-foreground">لا توجد حسابات مخزّنة بعد.</p>
                        ) : (
                          <ul className="space-y-3">
                            {emails.map((em) => (
                              <li
                                key={em}
                                className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <span className="break-all font-medium">{em}</span>
                                <div className="flex flex-wrap gap-2">
                                  {editEmail === em ? (
                                    <form
                                      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
                                      onSubmit={handleAddOrUpdate}
                                    >
                                      <Input
                                        type="password"
                                        placeholder="كلمة المرور الجديدة"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        className="sm:max-w-[200px]"
                                        autoComplete="new-password"
                                      />
                                      <Button type="submit" size="sm" disabled={saving || !editPassword.trim()}>
                                        حفظ
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditEmail(null);
                                          setEditPassword("");
                                        }}
                                      >
                                        إلغاء
                                      </Button>
                                    </form>
                                  ) : (
                                    <>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditEmail(em);
                                          setEditPassword("");
                                        }}
                                      >
                                        تغيير كلمة المرور
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => void handleDelete(em)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
