"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, Loader2, Lock } from "lucide-react";
import { DashboardLayout } from "@/app/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { notifyError, notifySuccess } from "@/lib/notify";

export function AdminDirectoryClient() {
  const [loading, setLoading] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [usesDbPassword, setUsesDbPassword] = useState(false);
  const [gateInput, setGateInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/directory/status", { credentials: "include" });
      const json = (await res.json()) as {
        success?: boolean;
        dbAvailable?: boolean;
        gateUnlocked?: boolean;
        usesDbPassword?: boolean;
      };
      if (!res.ok) {
        notifyError("تعذر التحقق من الجلسة.");
        return;
      }
      setDbAvailable(!!json.dbAvailable);
      setGateUnlocked(!!json.gateUnlocked);
      setUsesDbPassword(!!json.usesDbPassword);
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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      notifyError("تعذر إغلاق القفل");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      notifyError("أدخل كلمة المرور الجديدة وتأكيدها.");
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      notifyError("كلمة المرور الجديدة وتأكيدها غير متطابقين.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/directory/dashboard-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        notifyError(json.error || "فشل التحديث");
        return;
      }
      notifySuccess("تم تحديث كلمة مرور الدخول الرئيسية. استخدمها من الآن في صفحة تسجيل الدخول.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshStatus();
    } catch {
      notifyError("حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleClearDbPassword = async () => {
    if (
      !confirm(
        "إلغاء كلمة المرور المحفوظة في القاعدة؟ سيعود الدخول ليعتمد على ADMIN_PASSWORD في Vercel فقط (يجب أن يكون مضبوطاً)."
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/admin/directory/dashboard-password", {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        notifyError(json.error || "فشل الإلغاء");
        return;
      }
      notifySuccess("تم الإلغاء. الدخول يعتمد الآن على متغيرات البيئة فقط.");
      await refreshStatus();
    } catch {
      notifyError("حدث خطأ");
    } finally {
      setClearing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-lg px-4 py-8 sm:max-w-xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">كلمة مرور الدخول الرئيسية</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              تغيير كلمة مرور <strong>/login</strong> (لوحة التحكم) — متغير{" "}
              <span className="font-mono text-xs">ADMIN_PASSWORD</span> على Vercel. صفحة{" "}
              <strong>/admin/pricing</strong> تستخدم متغيراً منفصلاً:{" "}
              <span className="font-mono text-xs">ADMIN_PRICING_PASSWORD</span>. عند الحفظ هنا تُستخدم كلمة
              القاعدة بدل Vercel لـ /login فقط.
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
                    اربط Postgres (POSTGRES_URL أو DATABASE_URL على Vercel) ثم أعد النشر. بدون قاعدة بيانات لا
                    يمكن حفظ كلمة مرور جديدة من هذه الصفحة؛ يبقى الدخول يعتمد على ADMIN_PASSWORD في الاستضافة
                    فقط.
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
                    أدخل كلمة مرور القفل للمتابعة إلى تغيير كلمة مرور الدخول الرئيسية.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">كلمة مرور القفل</label>
                      <PasswordInput
                        autoComplete="off"
                        value={gateInput}
                        onChange={(e) => setGateInput(e.target.value)}
                        placeholder="••••••••"
                        className="text-base"
                      />
                    </div>
                    <Button type="submit" disabled={unlocking || !gateInput.trim()} className="w-full sm:w-auto">
                      {unlocking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="ml-2 h-4 w-4" />
                      )}
                      فتح القفل
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleLockAgain()}>
                    <Lock className="ml-2 h-4 w-4" />
                    إغلاق القفل
                  </Button>
                </div>

                {dbAvailable && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <KeyRound className="h-5 w-5" />
                        تغيير كلمة مرور /login
                      </CardTitle>
                      <CardDescription>
                        {usesDbPassword
                          ? "الدخول حالياً يعتمد على كلمة المرور المحفوظة في القاعدة (وليس على ADMIN_PASSWORD)."
                          : "الدخول حالياً يعتمد على ADMIN_PASSWORD في Vercel. بعد الحفظ هنا تصبح كلمة المرور من القاعدة هي المعتمدة."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">كلمة المرور الحالية</label>
                          <PasswordInput
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="ما تستخدمه الآن في تسجيل الدخول"
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">كلمة المرور الجديدة</label>
                          <PasswordInput
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="6 أحرف على الأقل"
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">تأكيد كلمة المرور الجديدة</label>
                          <PasswordInput
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="أعد إدخال الجديدة"
                            className="text-base"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="submit"
                            disabled={saving || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ كلمة المرور"}
                          </Button>
                          {usesDbPassword && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={clearing}
                              onClick={() => void handleClearDbPassword()}
                            >
                              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "إلغاء كلمة المرور من القاعدة"}
                            </Button>
                          )}
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
