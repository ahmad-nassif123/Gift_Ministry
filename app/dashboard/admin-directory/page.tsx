"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDirectoryClient } from "@/components/dashboard/admin-directory-client";

export default function AdminDirectoryPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => setAuthOk(res.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (authOk === false) {
      router.replace("/login?next=/dashboard/admin-directory");
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

  return <AdminDirectoryClient />;
}
