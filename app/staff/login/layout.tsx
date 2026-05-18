import type { Metadata } from "next";
import { buildStaffPortalMetadata } from "@/lib/staff-portal-metadata";

export const metadata: Metadata = buildStaffPortalMetadata("/staff/login");

export default function StaffLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
