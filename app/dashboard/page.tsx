"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardView } from "./dashboard-view";

export default function DashboardPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => {
        if (res.ok) setAuthOk(true);
        else setAuthOk(false);
      })
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [authOk, router]);

  if (authOk === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق...</p>
      </div>
    );
  }

  if (authOk === false) {
    return null;
  }

  return <DashboardView />;
}
