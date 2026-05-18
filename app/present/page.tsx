"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Maximize2,
  Minimize2,
  MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  products as initialProducts,
  isArchiveCatalogProduct,
  getGiftTierLabel,
  type Product,
} from "@/data/products";
import { siteConfig } from "@/lib/config";
import { catalogFilterTransition } from "@/lib/catalog-motion";
import {
  loadPublicProductsFromLocalStorage,
  PRODUCTS_STORAGE_KEY,
} from "@/lib/products-local-storage";
import { fetchPublicCatalogProducts } from "@/lib/fetch-public-products";

function skuSortKey(sku: string | undefined): number {
  const s = (sku ?? "").trim();
  const m = s.match(/(\d+)/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function compareProductsForCatalog(a: Product, b: Product): number {
  const ak = skuSortKey(a.sku);
  const bk = skuSortKey(b.sku);
  if (ak !== bk) return ak - bk;
  const as = (a.sku ?? "").localeCompare(b.sku ?? "", "en");
  if (as !== 0) return as;
  return a.name.localeCompare(b.name, "ar");
}

function orderPresentationSlides(products: Product[]): Product[] {
  const visible = products.filter((p) => !p.hidden);
  const archive = visible
    .filter(isArchiveCatalogProduct)
    .slice()
    .sort(compareProductsForCatalog);
  const catalog = visible
    .filter((p) => !isArchiveCatalogProduct(p))
    .slice()
    .sort(compareProductsForCatalog);
  return [...archive, ...catalog];
}

export default function PresentPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState<Product[]>(() =>
    orderPresentationSlides(initialProducts.filter((p) => !p.archived && !p.hidden))
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [fs, setFs] = useState(false);

  const total = slides.length;
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;
  const current = total > 0 ? slides[safeIndex] : null;

  useEffect(() => {
    if (index > 0 && index >= total) setIndex(Math.max(0, total - 1));
  }, [index, total]);

  useEffect(() => {
    const load = async () => {
      const data = await fetchPublicCatalogProducts();
      if (data) {
        setSlides(orderPresentationSlides(data));
        return;
      }
      setSlides(orderPresentationSlides(loadPublicProductsFromLocalStorage()));
    };
    void load();

    const onStorage = () => {
      void load();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("gift-catalog-products-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("gift-catalog-products-changed", onStorage);
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onFs = () => setFs(document.fullscreenElement === el);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const go = useCallback(
    (delta: 1 | -1) => {
      if (total <= 0) return;
      setDirection(delta);
      setIndex((i) => {
        const next = i + delta;
        if (next < 0) return total - 1;
        if (next >= total) return 0;
        return next;
      });
    },
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(-1);
      } else if (e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setDirection(-1);
        setIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setDirection(1);
        setIndex(Math.max(0, total - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  const toggleFs = useCallback(async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      //
    }
  }, []);

  const slideVariants = useMemo(
    () => ({
      enter: (dir: number) => ({
        opacity: 0,
        x: dir > 0 ? -28 : 28,
      }),
      center: { opacity: 1, x: 0 },
      exit: (dir: number) => ({
        opacity: 0,
        x: dir > 0 ? 24 : -24,
      }),
    }),
    []
  );

  const firstImage = current?.images?.[0];

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-[100dvh] flex-col bg-[#061a17] text-primary-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <MonitorPlay className="h-5 w-5 shrink-0 text-brand-gold-light opacity-90" aria-hidden />
          <span className="truncate text-sm font-medium text-white/90 sm:text-base">
            عرض تقديمي
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => void toggleFs()}
            title={fs ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
          >
            {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{fs ? "تصغير" : "ملء الشاشة"}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-white/90 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/" title="العودة للكتالوج">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">الكتالوج</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col">
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-white/80">
            <p>لا توجد هدايا للعرض حالياً.</p>
            <Button asChild variant="secondary">
              <Link href="/">العودة للرئيسية</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 pb-2 pt-4 sm:gap-4 sm:px-8 sm:pb-4">
              <div className="relative aspect-[4/3] w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-2xl sm:aspect-[16/10]">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  {current && (
                    <motion.div
                      key={current.slug}
                      role="img"
                      aria-label={current.name}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={catalogFilterTransition}
                      className="absolute inset-0 flex items-center justify-center bg-[#0a2520]"
                    >
                      {firstImage ? (
                        <Image
                          src={firstImage}
                          alt=""
                          fill
                          className="object-contain p-2 sm:p-4"
                          sizes="(max-width: 768px) 100vw, 1024px"
                          priority
                          unoptimized={firstImage.includes("/archive-images/")}
                        />
                      ) : (
                        <span className="text-white/50">لا توجد صورة</span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait">
                {current && (
                  <motion.div
                    key={current.slug + "-meta"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={catalogFilterTransition}
                    className="max-w-3xl text-center"
                  >
                    <p className="text-xs text-brand-gold-light/90 sm:text-sm">
                      {getGiftTierLabel(current.giftTier)}
                      {current.sku ? ` · ${current.sku}` : ""}
                    </p>
                    <h1 className="mt-1 text-xl font-bold leading-snug text-white sm:text-3xl md:text-4xl">
                      {current.name}
                    </h1>
                    {current.shortDescription ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/70 sm:line-clamp-4 sm:text-base">
                        {current.shortDescription}
                      </p>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative z-20 flex items-stretch justify-between gap-2 border-t border-white/10 px-2 py-3 sm:px-4">
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-[52px] flex-1 flex-col gap-1 rounded-lg border border-white/10 bg-white/5 py-3 text-white hover:bg-white/10 sm:min-h-[56px] sm:max-w-[200px]"
                onClick={() => go(1)}
                aria-label="الشريحة التالية"
              >
                <ChevronLeft className="mx-auto h-7 w-7 opacity-90" aria-hidden />
                <span className="text-sm font-medium">التالي</span>
              </Button>
              <div className="flex flex-col items-center justify-center px-2 text-center text-sm text-white/75">
                <span className="tabular-nums text-base font-semibold text-white sm:text-lg">
                  {safeIndex + 1} / {total}
                </span>
                <span className="mt-1 hidden text-xs text-white/50 sm:block">
                  ← يمين · يسار → · مسافة
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-[52px] flex-1 flex-col gap-1 rounded-lg border border-white/10 bg-white/5 py-3 text-white hover:bg-white/10 sm:min-h-[56px] sm:max-w-[200px]"
                onClick={() => go(-1)}
                aria-label="الشريحة السابقة"
              >
                <ChevronRight className="mx-auto h-7 w-7 opacity-90" aria-hidden />
                <span className="text-sm font-medium">السابق</span>
              </Button>
            </div>

            <p className="sr-only">
              اختصارات لوحة المفاتيح: السهم يمين للسابق، السهم يسار للتالي، مسافة للتالي،
              Home للبداية، End للنهاية، ملء الشاشة من الزر أعلى الصفحة.
            </p>
          </>
        )}
      </div>

      {!fs && (
        <footer className="relative z-20 border-t border-white/5 px-3 py-2 text-center text-[10px] text-white/35 sm:text-xs">
          {siteConfig.name}
        </footer>
      )}
    </div>
  );
}
