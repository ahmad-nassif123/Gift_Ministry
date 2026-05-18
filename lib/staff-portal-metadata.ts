import type { Metadata } from "next";

/** عنوان بوابة الموظفين — بلا اسم الكتالوج (تبويب المتصفح + معاينة الرابط) */
export function getStaffPortalTitle(): string {
  const fromEnv = process.env.NEXT_PUBLIC_STAFF_PORTAL_TITLE?.trim();
  return fromEnv || "تسجيل أعمال الموظفين";
}

export function getStaffPortalDescription(): string {
  const fromEnv = process.env.NEXT_PUBLIC_STAFF_PORTAL_DESCRIPTION?.trim();
  return fromEnv || "تعبئة تقرير الأعمال اليومي";
}

/** مسار المشاركة (افتراضي /staff/login — أو /work للرابط الأقصر) */
export function getStaffSharePath(): string {
  const p = process.env.NEXT_PUBLIC_STAFF_SHARE_PATH?.trim();
  if (!p) return "/staff/login";
  if (p === "/staff/login") return "/staff/login";
  return p.startsWith("/") ? p : `/${p}`;
}

export function resolveStaffPortalSiteOrigin(): string {
  const direct = process.env.NEXT_PUBLIC_STAFF_PORTAL_URL?.trim();
  if (direct) {
    try {
      return new URL(direct).origin;
    } catch {
      /* ignore */
    }
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (site) return site;
  return "https://gift-catalog-six.vercel.app";
}

/**
 * رابط المشاركة للموظفين (قصير إن وُجد /work أو مسار مخصص).
 */
export function getStaffPortalLoginUrl(fallbackOrigin?: string): string {
  const path = getStaffSharePath();
  const direct = process.env.NEXT_PUBLIC_STAFF_PORTAL_URL?.trim();
  if (direct && path === "/staff/login") {
    return direct.includes("/staff/login")
      ? direct.replace(/\/+$/, "")
      : `${direct.replace(/\/+$/, "")}/staff/login`;
  }
  const origin = resolveStaffPortalSiteOrigin() || fallbackOrigin?.trim().replace(/\/+$/, "");
  if (origin) return `${origin}${path}`;
  return path;
}

/** بيانات meta لصفحات /staff — تستبدل معاينة «كتالوج الهدايا» في واتساب/تيليجرام */
export function buildStaffPortalMetadata(pagePath = "/staff/login"): Metadata {
  const title = getStaffPortalTitle();
  const description = getStaffPortalDescription();
  const metadataBase = new URL(resolveStaffPortalSiteOrigin());

  return {
    metadataBase,
    title: { absolute: title },
    description,
    applicationName: title,
    appleWebApp: { title },
    authors: [{ name: title }],
    creator: title,
    publisher: title,
    openGraph: {
      type: "website",
      locale: "ar_SA",
      url: pagePath,
      title,
      description,
      siteName: title,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: false, follow: false },
    manifest: "/staff/manifest.webmanifest",
  };
}

/** @deprecated استخدم buildStaffPortalMetadata */
export function staffPortalMetadata(): Metadata {
  return buildStaffPortalMetadata("/staff/login");
}
