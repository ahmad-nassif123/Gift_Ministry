"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RememberMeCheckbox } from "@/components/remember-me-checkbox";
import { loadRememberedLogin, persistRememberedLogin } from "@/lib/remember-login";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "";
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = loadRememberedLogin("dashboard");
    if (saved.remember && saved.password) {
      setRememberMe(true);
      setPassword(saved.password);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, rememberMe, next: nextUrl || undefined }),
        credentials: "include",
      });
      const raw = await res.text();
      let data: { success?: boolean; error?: string; redirect?: string } = {};
      try {
        if (raw) data = JSON.parse(raw) as typeof data;
      } catch {
        setError(
          res.status === 401
            ? "كلمة المرور غير صحيحة"
            : "حدث خطأ أثناء الاتصال — استجابة غير متوقعة من الخادم"
        );
        return;
      }

      if (data.success) {
        persistRememberedLogin("dashboard", password, rememberMe);
        const dest =
          typeof data.redirect === "string" && data.redirect.startsWith("/")
            ? data.redirect
            : "/dashboard";
        // تحميل كامل يضمن إرسال الكوكي مع الطلب التالي (أوثق من router.push مع الجلسة)
        window.location.assign(dest);
        return;
      }
      if (res.status === 401) {
        setError(data.error?.trim() || "كلمة المرور غير صحيحة");
        return;
      }
      if (res.status === 503) {
        setError(
          data.error?.trim() ||
            "تسجيل الدخول غير مفعّل على الخادم."
        );
        return;
      }
      setError(data.error?.trim() || "فشل تسجيل الدخول");
    } catch (err) {
      const isNetwork =
        err instanceof TypeError &&
        (String(err.message).includes("fetch") || String(err.message).includes("Failed to fetch"));
      setError(
        isNetwork
          ? "تعذّر الاتصال بالخادم. تحقق من الإنترنت أو أن الرابط يبدأ بـ https وأنك على نفس موقع التطبيق."
          : "حدث خطأ غير متوقع أثناء تسجيل الدخول."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold">تسجيل الدخول — لوحة التحكم</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          كلمة مرور إدارة الهدايا والطلبات
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            كلمة المرور
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>
        <RememberMeCheckbox
          id="login-remember-me"
          checked={rememberMe}
          onCheckedChange={(checked) => {
            setRememberMe(checked);
            if (!checked) persistRememberedLogin("dashboard", "", false);
          }}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "جاري الدخول..." : "دخول"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline hover:text-foreground">
          العودة للرئيسية
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center text-muted-foreground">جاري التحميل...</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
