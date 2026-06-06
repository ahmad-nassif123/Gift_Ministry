"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, MonitorPlay, Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/lib/config";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="no-print lux-chrome-header sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex min-w-0 max-w-[55%] items-center gap-2 sm:gap-3 md:max-w-none">
          <div className="relative h-7 w-28 shrink-0 sm:h-8 sm:w-32 md:h-9 md:w-36">
            <Image
              src={siteConfig.logoPath}
              alt={siteConfig.logoAlt}
              fill
              className="object-contain object-center text-[0px]"
              priority
              sizes="(max-width: 768px) 112px, 144px"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/#products"
            className="flex flex-col w-fit h-[29px] text-base font-medium transition-colors hover:text-brand-green-dark"
          >
            الهدايا العامة
          </Link>
          <Link
            href="/private#private-products"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-green-dark"
          >
            <Star className="h-4 w-4 shrink-0" aria-hidden />
            الهدايا الخاصة
          </Link>
          <Link
            href="/present"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-green-dark"
          >
            <MonitorPlay className="h-4 w-4 shrink-0" aria-hidden />
            عرض تقديمي
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            لوحة التحكم
          </Link>
        </div>

        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-brand-green-dark/10 hover:text-brand-green-dark h-12 w-12"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">فتح القائمة</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>{siteConfig.name}</SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col gap-4">
              <Link
                href="/#products"
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium transition-colors hover:text-brand-green-dark"
              >
                الهدايا العامة
              </Link>
              <Link
                href="/private#private-products"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-lg font-medium text-muted-foreground transition-colors hover:text-brand-green-dark"
              >
                <Star className="h-5 w-5 shrink-0" aria-hidden />
                الهدايا الخاصة
              </Link>
              <Link
                href="/present"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-lg font-medium text-muted-foreground transition-colors hover:text-brand-green-dark"
              >
                <MonitorPlay className="h-5 w-5 shrink-0" aria-hidden />
                عرض تقديمي
              </Link>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                لوحة التحكم
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

