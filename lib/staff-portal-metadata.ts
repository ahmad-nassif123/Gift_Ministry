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

/** بيانات meta لصفحات /staff — تمنع لاحقة «- كتالوج الهدايا الفاخرة» ومعاينة الكتالوج */
export function staffPortalMetadata(): Metadata {
  const title = getStaffPortalTitle();
  const description = getStaffPortalDescription();
  return {
    title: { absolute: title },
    description,
    applicationName: title,
    appleWebApp: { title },
    openGraph: {
      type: "website",
      locale: "ar_SA",
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
