"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    // Register only in production and secure contexts (HTTPS / localhost).
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js?v=2", { scope: "/", updateViaCache: "none" });
      } catch {
        // Silent: install prompt is a progressive enhancement.
      }
    };

    register();
  }, []);

  return null;
}

