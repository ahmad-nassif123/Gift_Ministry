import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from "@/lib/browser-storage";

export type RememberLoginKind = "dashboard" | "pricing";

const REMEMBER_FLAG: Record<RememberLoginKind, string> = {
  dashboard: "gift-catalog-remember-dashboard",
  pricing: "gift-catalog-remember-pricing",
};

const SAVED_PASSWORD: Record<RememberLoginKind, string> = {
  dashboard: "gift-catalog-saved-dashboard-password",
  pricing: "gift-catalog-saved-pricing-password",
};

export function loadRememberedLogin(kind: RememberLoginKind): { remember: boolean; password: string } {
  const remember = safeLocalStorageGetItem(REMEMBER_FLAG[kind]) === "1";
  const password = remember ? safeLocalStorageGetItem(SAVED_PASSWORD[kind]) ?? "" : "";
  return { remember, password };
}

/** يحفظ تفضيل «تذكرني» وكلمة المرور على هذا الجهاز فقط (لا تُرسل للخادم). */
export function persistRememberedLogin(kind: RememberLoginKind, password: string, remember: boolean): void {
  if (remember && password.trim()) {
    safeLocalStorageSetItem(REMEMBER_FLAG[kind], "1");
    safeLocalStorageSetItem(SAVED_PASSWORD[kind], password.trim());
    return;
  }
  safeLocalStorageRemoveItem(REMEMBER_FLAG[kind]);
  safeLocalStorageRemoveItem(SAVED_PASSWORD[kind]);
}
