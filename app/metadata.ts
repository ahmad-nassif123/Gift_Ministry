import { Metadata } from "next";
import { siteConfig } from "@/lib/config";

function resolveMetadataBase(): URL {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (site) {
    try {
      return new URL(site);
    } catch {
      /* fall through */
    }
  }
  return new URL("https://gift-catalog-six.vercel.app");
}

export const defaultMetadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ["هدايا", "هدايا فاخرة", "هدايا تراثية", "كتالوج هدايا", "معرض هدايا", "عرض هدايا"],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

