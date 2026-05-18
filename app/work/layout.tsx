import type { Metadata } from "next";
import { buildStaffPortalMetadata } from "@/lib/staff-portal-metadata";

export const metadata: Metadata = buildStaffPortalMetadata("/work");

export default function WorkShortLayout({ children }: { children: React.ReactNode }) {
  return children;
}
