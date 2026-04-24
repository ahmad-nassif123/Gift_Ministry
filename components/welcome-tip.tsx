"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, ShoppingCart } from "lucide-react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "@/lib/browser-storage";

const STORAGE_KEY = "welcome_tip_seen";

export function WelcomeTip() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  const isCatalogPage = pathname === "/" || (pathname?.startsWith("/products") ?? false);

  useEffect(() => {
    if (typeof window === "undefined" || !isCatalogPage) return;
    const seen = safeLocalStorageGetItem(STORAGE_KEY);
    if (!seen) setShow(true);
  }, [isCatalogPage]);

  const handleDismiss = () => {
    setShow(false);
    safeLocalStorageSetItem(STORAGE_KEY, "1");
  };

  if (!show || !isCatalogPage) return null;

  return (
    <div className="no-print fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto md:left-6 md:right-auto shadow-xl rounded-xl border bg-background p-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ShoppingCart className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">كيف تطلب؟</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            اختر الهدايا واضغط <strong>أضف للطلبية</strong>، ثم افتح سلة الطلبية (أيقونة الأسفل) وادخل الجهة الطالبة إن رغبت، واضغط <strong>تصدير PDF</strong> لتحميل الطلبية أو إرسالها بالبريد.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
