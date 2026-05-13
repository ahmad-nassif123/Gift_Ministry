"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "";
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: nextUrl || undefined }),
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
            "تسجيل الدخول غير مفعّل على الخادم. أضف ADMIN_PASSWORD في Vercel ثم Redeploy."
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
        <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          للمسؤولين فقط — أدخل كلمة مرور لوحة التحكم (تُضبط في متغير البيئة ADMIN_PASSWORD على الخادم).
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            كلمة المرور
          </label>
          <div className="relative" dir="ltr">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="pe-11 text-left"
              dir="ltr"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute end-1 top-1/2 h-9 w-9 -translate-y-1/2 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
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
