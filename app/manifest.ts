import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b443a",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: siteConfig.iconPath, sizes: "any", type: "image/x-icon", purpose: "any" },
    ],
  };
}
