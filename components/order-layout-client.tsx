"use client";

import { usePathname } from "next/navigation";
import { OrderProvider } from "@/contexts/order-context";
import { OrderCart } from "@/components/order-cart";
import { AnnouncementBar } from "@/components/announcement-bar";
import { WelcomeTip } from "@/components/welcome-tip";
import { ScrollToTop } from "@/components/scroll-to-top";
import { DraftReminder } from "@/components/draft-reminder";

export function OrderLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/present") {
    return <>{children}</>;
  }

  return (
    <OrderProvider>
      <AnnouncementBar />
      <OrderCart />
      <DraftReminder />
      <WelcomeTip />
      <ScrollToTop />
      {children}
    </OrderProvider>
  );
}
