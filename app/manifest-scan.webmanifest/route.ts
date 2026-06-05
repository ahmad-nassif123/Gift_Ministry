import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

/** يُولَّد ديناميكياً لاستخدام نفس مسار الشعار الموحّد في siteConfig */
export async function GET() {
  const body = {
    name: "مسح الهدايا",
    short_name: "مسح الهدايا",
    description: "تطبيق مسح رموز QR لتسجيل توزيع الهدايا",
    start_url: "/scan",
    scope: "/scan",
    display: "standalone",
    orientation: "portrait",
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
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
