"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Star, LogOut } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { RememberMeCheckbox } from "@/components/remember-me-checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadRememberedLogin, persistRememberedLogin } from "@/lib/remember-login";

export function PrivateCatalogGate({ children }: { children: ReactNode }) {
  const [gateOk, setGateOk] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  const checkGate = useCallback(async () => {
    try {
      const res = await fetch("/api/private-catalog/session", { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean };
      setGateOk(Boolean(json.ok));
    } catch {
      setGateOk(false);
    }
  }, []);

  useEffect(() => {
    const saved = loadRememberedLogin("private");
    if (saved.remember && saved.password) {
      setRememberMe(true);
      setPassword(saved.password);
    }
    void checkGate();
  }, [checkGate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggingIn) return;
    setError("");
    setLoggingIn(true);
    try {
      const res = await fetch("/api/private-catalog/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, rememberMe }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) {
        persistRememberedLogin("private", password, rememberMe);
        if (!rememberMe) setPassword("");
        await checkGate();
        return;
      }
      setError(
        json.error ||
          (res.status === 503 ? "تسجيل الدخول غير مفعّل على الخادم" : "كلمة المرور غير صحيحة")
      );
    } catch {
      setError("حدث خطأ أثناء الدخول.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/private-catalog/logout", { method: "POST", credentials: "include" });
    } catch {
      //
    }
    setGateOk(false);
    setPassword("");
  };

  if (gateOk === null) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">جاري التحقق...</p>
        </main>
        <Footer />
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
                <Star className="h-5 w-5" />
                الهدايا الخاصة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                أدخل كلمة مرور الهدايا الخاصة للاطلاع على هذا القسم.
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="private-catalog-pass" className="mb-1 block text-sm font-medium">
                    كلمة المرور
                  </label>
                  <PasswordInput
                    id="private-catalog-pass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <RememberMeCheckbox
                  id="private-catalog-remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => {
                    setRememberMe(checked);
                    if (!checked) persistRememberedLogin("private", "", false);
                  }}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="min-h-[44px] w-full" disabled={loggingIn}>
                  {loggingIn ? "جاري الدخول..." : "دخول"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/" className="underline hover:text-foreground">
                    العودة للصفحة العامة
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
    <>
      <div className="no-print border-b bg-muted/40">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2 text-sm">
          <span className="text-muted-foreground">أنت تعرض الهدايا الخاصة</span>
          <Button type="button" variant="ghost" size="sm" className="min-h-[44px]" onClick={() => void handleLogout()}>
            <LogOut className="ml-2 h-4 w-4" />
            خروج
          </Button>
        </div>
      </div>
      {children}
    </>
  );
}
