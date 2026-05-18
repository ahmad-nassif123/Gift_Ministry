import type { Metadata } from "next";
import { buildStaffPortalMetadata } from "@/lib/staff-portal-metadata";

export const metadata: Metadata = buildStaffPortalMetadata("/staff");

/** بوابة معزولة — بدون شريط الموقع أو روابط الكتالوج */
export default function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6 sm:max-w-xl sm:py-8">
        {children}
      </div>
    </div>
  );
}
