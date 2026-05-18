"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { RememberMeCheckbox } from "@/components/remember-me-checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from "@/lib/browser-storage";

const STAFF_REMEMBER = "gift-catalog-staff-remember";
const STAFF_LOGIN_ID = "gift-catalog-staff-login-id";
const STAFF_PASSWORD = "gift-catalog-staff-password";

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/staff/report";
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/staff/session", { credentials: "include" })
      .then((res) => {
        if (res.ok) router.replace("/staff/report");
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    if (safeLocalStorageGetItem(STAFF_REMEMBER) === "1") {
      setRememberMe(true);
      setLoginId(safeLocalStorageGetItem(STAFF_LOGIN_ID) ?? "");
      setPassword(safeLocalStorageGetItem(STAFF_PASSWORD) ?? "");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password, rememberMe }),
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error ?? "تعذر تسجيل الدخول");
        return;
      }
      if (rememberMe) {
        safeLocalStorageSetItem(STAFF_REMEMBER, "1");
        safeLocalStorageSetItem(STAFF_LOGIN_ID, loginId.trim());
        safeLocalStorageSetItem(STAFF_PASSWORD, password);
      } else {
        safeLocalStorageRemoveItem(STAFF_REMEMBER);
        safeLocalStorageRemoveItem(STAFF_LOGIN_ID);
        safeLocalStorageRemoveItem(STAFF_PASSWORD);
      }
      router.replace(data.redirect ?? nextUrl);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full border-primary/15 shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">تسجيل أعمال اليوم</CardTitle>
        <p className="text-sm text-muted-foreground">
          ادخل بحسابك الشخصي — هذا الرابط للتقرير اليومي فقط
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="staff-login-id" className="text-sm font-medium">
              معرّف الدخول
            </label>
            <Input
              id="staff-login-id"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="مثال: ahmad.m"
              required
              dir="ltr"
              className="text-left"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="staff-password" className="text-sm font-medium">
              كلمة المرور
            </label>
            <PasswordInput
              id="staff-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <RememberMeCheckbox id="staff-remember" checked={rememberMe} onCheckedChange={setRememberMe} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full min-h-11" disabled={submitting}>
            {submitting ? "جاري الدخول…" : "دخول"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function StaffLoginClient() {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground py-12">جاري التحميل…</p>}>
      <StaffLoginForm />
    </Suspense>
  );
}
