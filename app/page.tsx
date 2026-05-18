"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  catalogFilterTransition,
  catalogTransition,
} from "@/lib/catalog-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { QuickViewModal } from "@/components/quick-view-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  products as initialProducts,
  getAllGiftTiers,
  getGiftTierLabel,
  isArchiveCatalogProduct,
  type GiftTier,
  type Product,
} from "@/data/products";
import { useOrder } from "@/contexts/order-context";
import { siteConfig } from "@/lib/config";
import {
  loadPublicProductsFromLocalStorage,
  PRODUCTS_STORAGE_KEY,
} from "@/lib/products-local-storage";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "@/lib/browser-storage";
import { fetchPublicCatalogProducts } from "@/lib/fetch-public-products";

function applyArabicSearchCorrections(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";

  // تصحيحات شائعة (قابلة للتوسيع لاحقاً)
  const phraseMap: Array<[RegExp, string]> = [
    [/\bهديه\b/g, "هدية"],
    [/\bهدايا\b/g, "هدايا"], // placeholder to keep list structure
    [/\bفاخره\b/g, "فاخرة"],
    [/\bرسميه\b/g, "رسمية"],
    [/\bمكتبيه\b/g, "مكتبية"],
    [/\bترويجيه\b/g, "ترويجية"],
  ];

  let out = s;
  for (const [re, rep] of phraseMap) out = out.replace(re, rep);

  // تحسينات بسيطة لكتابة العربية
  out = out
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ة") // نتركها كما هي (تعديلها قد يفسد كلمات صحيحة)
    .replace(/ـ/g, "") // تطويل
    .replace(/\s+/g, " ");

  return out;
}

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

function HomeContent() {
  const searchParams = useSearchParams();
  const { addToOrder } = useOrder();
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [selectedGiftTier, setSelectedGiftTier] = useState<GiftTier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const giftTiers = getAllGiftTiers();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const n = parseInt(safeLocalStorageGetItem("visit_count") ?? "0", 10);
        safeLocalStorageSetItem("visit_count", String(n + 1));
      } catch {}
    }
  }, []);

  // تحميل المنتجات: من API ثم localStorage العام (بدون دمج مع القائمة الثابتة — يمنع عودة المحذوف)
  useEffect(() => {
    setMounted(true);
    const fetchProducts = async () => {
      const data = await fetchPublicCatalogProducts();
      if (data) {
        setAllProducts(data);
        safeLocalStorageSetItem(PRODUCTS_STORAGE_KEY, JSON.stringify(data));
        return;
      }
      setAllProducts(loadPublicProductsFromLocalStorage());
    };

    void fetchProducts();

    const AUTO_REFRESH_MS = 45 * 1000;
    const refreshTimer = setInterval(() => void fetchProducts(), AUTO_REFRESH_MS);

    const handleStorageChange = () => {
      void fetchProducts();
    };

    const handleCatalogNotify = () => {
      void fetchProducts();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("gift-catalog-products-changed", handleCatalogNotify);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("gift-catalog-products-changed", handleCatalogNotify);
      clearInterval(refreshTimer);
    };
  }, []);

  const filteredByFilters = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesGiftTier =
        selectedGiftTier === null || product.giftTier === selectedGiftTier;
      return matchesGiftTier;
    });
  }, [allProducts, selectedGiftTier]);

  const searchLower = searchQuery.trim().toLowerCase();
  const correctedSearchQuery = useMemo(() => {
    // نعتمد التصحيح على النص الأصلي (قبل toLowerCase) كي نُظهره للمستخدم بشكل طبيعي
    const corrected = applyArabicSearchCorrections(searchQuery);
    if (!corrected) return "";
    // لا تعرض اقتراحاً إذا كان مطابقاً فعلياً
    if (corrected.trim() === searchQuery.trim()) return "";
    return corrected;
  }, [searchQuery]);

  const searchSuggestions = useMemo(() => {
    if (!searchLower || searchLower.length < 1) return [];
    return filteredByFilters
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.sku && p.sku.toLowerCase().includes(searchLower))
      )
      .slice(0, 8);
  }, [filteredByFilters, searchLower]);

  const filteredProductsRaw = useMemo(() => {
    if (!searchLower) return filteredByFilters;
    return filteredByFilters.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.sku && p.sku.toLowerCase().includes(searchLower))
    );
  }, [filteredByFilters, searchLower]);

  const filteredProducts = filteredProductsRaw;

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedGiftTier !== null;

  const catalogFilterKey = `${selectedGiftTier ?? "all"}__${searchLower}`;

  const { archiveGridProducts, catalogGridProducts } = useMemo(() => {
    const archive = filteredProducts
      .filter(isArchiveCatalogProduct)
      .slice()
      .sort(compareProductsForCatalog);
    const catalog = filteredProducts
      .filter((p) => !isArchiveCatalogProduct(p))
      .slice()
      .sort(compareProductsForCatalog);
    return { archiveGridProducts: archive, catalogGridProducts: catalog };
  }, [filteredProducts]);

  const renderProductGrid = (list: Product[], keyPrefix: string) => (
    <div
      className={[
        // موبايل: عمودين ثابتين لبطاقات أصغر
        "grid grid-cols-2 gap-2",
        // من sm+: شبكة مرنة تمنع ظهور صف أخير "منعزل" (بطاقتين لوحدهم)
        "sm:gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]",
        "lg:gap-6",
      ].join(" ")}
    >
      {list.map((product, index) => (
        <ProductCard
          key={`${keyPrefix}-${product.slug}`}
          product={product}
          index={index}
          onAddToOrder={addToOrder}
          onQuickView={setQuickViewProduct}
        />
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-brand-green-light/5 to-brand-gold-light/10 py-4 pb-8">
          <div className="flex flex-col items-center justify-center gap-4 px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...catalogTransition, duration: 0.72 }}
              className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl"
            >
              <Image
                src={siteConfig.logoPath}
                alt={siteConfig.logoAlt}
                width={900}
                height={320}
                className="w-full h-auto object-contain"
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 768px"
              />
            </motion.div>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="py-6 sm:py-14 md:py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={catalogTransition}
              className="mb-8 text-center"
            >
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                معرض الهدايا
              </h2>
              <p className="text-muted-foreground">
                تصفح مجموعتنا المتنوعة من الهدايا الفاخرة والتراثية المعروضة
              </p>
            </motion.div>

            {/* بحث مع اقتراحات */}
            <div className="relative mb-6 max-w-md mx-auto">
              <input
                type="text"
                placeholder="ابحث عن هدية بالاسم أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 pr-10 text-right focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {correctedSearchQuery && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-right">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      هل تقصد:{" "}
                      <span className="font-semibold text-foreground">{correctedSearchQuery}</span>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => {
                        setSearchQuery(correctedSearchQuery);
                        setSearchFocused(false);
                      }}
                    >
                      تطبيق التصحيح
                    </Button>
                  </div>
                </div>
              )}
              {(searchFocused || searchQuery) && searchSuggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border bg-background shadow-lg">
                  {searchSuggestions.map((p) => (
                    <li key={p.slug}>
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-right text-sm hover:bg-muted"
                        onClick={() => {
                          setSearchQuery(p.name);
                          setSearchFocused(false);
                        }}
                      >
                        <span className="font-medium">{p.name}</span>
                        {p.sku && <span className="mr-2 text-muted-foreground">— {p.sku}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Filters + ترتيب */}
            <div className="mb-8 space-y-4">
              <div>
                <p className="mb-3 text-base font-semibold text-foreground">تصنيف الهدايا:</p>
                <motion.div
                  layout
                  transition={catalogFilterTransition}
                  className="flex flex-wrap gap-3"
                >
                  <Badge
                    variant={selectedGiftTier === null ? "default" : "outline"}
                    className="cursor-pointer text-base px-4 py-2 min-h-[44px] inline-flex items-center transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                    onClick={() => setSelectedGiftTier(null)}
                  >
                    الكل
                  </Badge>
                  {giftTiers.map((tier) => (
                    <Badge
                      key={tier}
                      variant={
                        selectedGiftTier === tier ? "default" : "outline"
                      }
                      className="cursor-pointer text-base px-4 py-2 min-h-[44px] inline-flex items-center transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      onClick={() => setSelectedGiftTier(tier)}
                    >
                      {getGiftTierLabel(tier)}
                    </Badge>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* شبكة المنتجات: عناصر الأرشيف أولاً ثم باقي الكتالوج */}
            <AnimatePresence mode="wait">
              {filteredProducts.length > 0 ? (
                <motion.div
                  key={catalogFilterKey}
                  role="region"
                  aria-live="polite"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={catalogFilterTransition}
                  className="space-y-6 sm:space-y-12"
                >
                  {archiveGridProducts.length > 0 && (
                    <div>{renderProductGrid(archiveGridProducts, "arch")}</div>
                  )}
                  {catalogGridProducts.length > 0 && (
                    <div>{renderProductGrid(catalogGridProducts, "cat")}</div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={`empty-${catalogFilterKey}`}
                  role="status"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={catalogFilterTransition}
                  className="py-12 text-center space-y-4"
                >
                  <p className="text-lg text-muted-foreground">
                    لم يتم العثور على هدايا تطابق البحث أو التصفية
                  </p>
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px]"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedGiftTier(null);
                      }}
                    >
                      مسح البحث والتصفية
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

      </main>

      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToOrder={addToOrder}
        />
      )}

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </main>
          <Footer />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

