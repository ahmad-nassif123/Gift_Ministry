import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";
import { getStaffPortalDescription, getStaffPortalTitle } from "@/lib/staff-portal-metadata";

/** PWA منفصل لبوابة الموظف — اسم التطبيق لا يعرض اسم الكتالوج */
export async function GET() {
  const body = {
    name: getStaffPortalTitle(),
    short_name: "أعمال",
    description: getStaffPortalDescription(),
    start_url: "/staff/login",
    scope: "/staff",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b443a",
    dir: "rtl",
    lang: "ar",
    icons: [
      {
        src: siteConfig.iconPath,
        sizes: "any",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
  };
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
