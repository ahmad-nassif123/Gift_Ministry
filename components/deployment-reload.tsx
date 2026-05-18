"use client";

import { useEffect } from "react";
import { PRODUCTS_STORAGE_KEY } from "@/lib/products-local-storage";

const BUILD_KEY = "gift-catalog-build-id";

/**
 * بعد نشر جديد على Vercel: يمسح كاش المنتجات المحلي ويعيد تحميل الصفحة مرة واحدة
 * حتى تظهر تغييرات الواجهة والأسعار دون مسح يدوي للمتصفح.
 */
export function DeploymentReload() {
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const res = await fetch(`/api/build?_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { buildId?: string };
        const buildId = String(json.buildId ?? "").trim();
        if (!buildId) return;

        const prev = sessionStorage.getItem(BUILD_KEY);
        if (prev && prev !== buildId) {
          try {
            localStorage.removeItem(PRODUCTS_STORAGE_KEY);
          } catch {
            //
          }
          try {
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
          } catch {
            //
          }
          sessionStorage.setItem(BUILD_KEY, buildId);
          window.location.reload();
          return;
        }
        if (!prev) sessionStorage.setItem(BUILD_KEY, buildId);
      } catch {
        //
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
