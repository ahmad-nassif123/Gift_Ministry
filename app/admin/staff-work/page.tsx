"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminStaffWorkClient } from "@/components/admin/admin-staff-work-client";

export default function AdminStaffWorkPage() {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/pricing/session", { credentials: "include" })
      .then((res) => setOk(res.ok))
      .catch(() => setOk(false));
  }, []);

  useEffect(() => {
    if (ok === false) router.replace("/admin/pricing");
  }, [ok, router]);

  if (ok === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">جاري التحقق…</p>
      </div>
    );
  }
  if (!ok) return null;
  return <AdminStaffWorkClient />;
}
