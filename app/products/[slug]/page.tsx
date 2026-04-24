"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, ShoppingCart, Plus, Minus, Share2, QrCode } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "@/components/product-card";
import { products as initialProducts, getGiftTierLabel, type Product } from "@/data/products";
import {
  loadPublicProductsFromLocalStorage,
  PRODUCTS_STORAGE_KEY,
} from "@/lib/products-local-storage";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { useOrder } from "@/contexts/order-context";
import { ImageLightbox } from "@/components/image-lightbox";
import { ProductQRModal } from "@/components/product-qr-modal";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { notifyError } from "@/lib/notify";
import { safeLocalStorageSetItem } from "@/lib/browser-storage";

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const { addToOrder } = useOrder();
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [mounted, setMounted] = useState(false);
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [orderQty, setOrderQty] = useState(1);
  const [shareDone, setShareDone] = useState(false);
  const [orderAdded, setOrderAdded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);

  const handleShare = async () => {
    if (!product) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${product.name} — كتالوج الهدايا`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: product.name,
          text,
          url,
        });
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      } else {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        setTimeout(() => setShareDone(false), 2000);
      } catch {
        notifyError("تعذر نسخ الرابط");
      }
    }
  };

  // تحميل القائمة من API ثم التخزين المحلي (بدون دمج مع data/products لتفادي عرض المحذوف)
  useEffect(() => {
    let cancelled = false;
    const searchSlug = decodeURIComponent(params.slug);

    const applyList = (list: Product[]) => {
      if (cancelled) return;
      setAllProducts(list);
      const found = list.find(
        (p) => decodeURIComponent(p.slug) === searchSlug || p.slug === searchSlug
      );
      setProduct(found);
      setMounted(true);
    };

    async function load() {
      try {
        const res = await fetch("/api/products");
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const data = json.data as Product[];
          safeLocalStorageSetItem(PRODUCTS_STORAGE_KEY, JSON.stringify(data));
          applyList(data);
          return;
        }
      } catch {
        //
      }
      applyList(loadPublicProductsFromLocalStorage());
    }

    void load();

    const onRev = () => void load();
    window.addEventListener("gift-catalog-products-changed", onRev);
    window.addEventListener("storage", onRev);
    return () => {
      cancelled = true;
      window.removeEventListener("gift-catalog-products-changed", onRev);
      window.removeEventListener("storage", onRev);
    };
  }, [params.slug]);

  // عرض loading أثناء التحميل (فقط قبل mount)
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // إذا لم يتم العثور على المنتج بعد تحميل البيانات
  if (mounted && !product) {
    notFound();
  }

  // التأكد من وجود المنتج قبل العرض
  if (!product) {
    return null;
  }
  const isOnRecommendation = (product.availableQuantity ?? 0) === 0;

  // Get related products (same gift tier, excluding current)
  const relatedProducts = allProducts
    .filter(
      (p: Product) => p.giftTier === product.giftTier && p.slug !== product.slug
    )
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Link href="/" className="hover:text-brand-green-dark">
                الرئيسية
              </Link>
              <ArrowRight className="h-5 w-5 rotate-180" />
              <Link href="/#products" className="hover:text-brand-green-dark">
                الهدايا
              </Link>
              <ArrowRight className="h-5 w-5 rotate-180" />
              <span className="text-foreground">{product.name}</span>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <section className="py-6 sm:py-8 md:py-16">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
              {/* Images - شبكة 4 صور */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[0, 1, 2, 3].map((slotIndex) => {
                    const imgSrc = product.images?.length
                      ? product.images[Math.min(slotIndex, product.images.length - 1)]
                      : null;
                    const imageIndex = Math.min(slotIndex, (product.images?.length ?? 1) - 1);
                    return (
                      <button
                        key={slotIndex}
                        type="button"
                        onClick={() => {
                          if (product.images?.length) {
                            setLightboxIndex(imageIndex);
                            setLightboxOpen(true);
                          }
                        }}
                        className="relative aspect-square w-full overflow-hidden rounded-lg bg-white dark:bg-muted shadow-md cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary transition-shadow duration-200 hover:shadow-lg"
                      >
                        {imgSrc ? (
                          <Image
                            src={imgSrc}
                            alt={`${product.name} - ${slotIndex + 1}`}
                            fill
                            sizes="(max-width: 1024px) 50vw, 25vw"
                            className="object-contain transition-opacity duration-300"
                            loading={slotIndex < 2 ? "eager" : "lazy"}
                            placeholder="blur"
                            blurDataURL={BLUR_DATA_URL}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector(".fallback-text")) {
                                const fallback = document.createElement("div");
                                fallback.className = "fallback-text flex h-full w-full items-center justify-center text-muted-foreground text-sm";
                                fallback.textContent = "لا توجد صورة";
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                            لا توجد صورة
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {qrOpen && product && (
                  <ProductQRModal
                    sku={product.sku}
                    productSlug={product.slug}
                    productName={product.name}
                    onClose={() => setQrOpen(false)}
                  />
                )}
                {lightboxOpen && product.images?.length ? (
                  <ImageLightbox
                    images={product.images}
                    currentIndex={lightboxIndex}
                    onClose={() => setLightboxOpen(false)}
                    onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
                    onNext={() => setLightboxIndex((i) => Math.min(product.images!.length - 1, i + 1))}
                    productName={product.name}
                  />
                ) : null}
              </motion.div>

              {/* Product Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-6"
              >
                <div>
                  {product.giftTier && (
                    <div className="mb-3">
                      <Badge 
                        variant={product.giftTier === "luxury" ? "default" : "outline"}
                        className={
                          product.giftTier === "luxury" 
                            ? "bg-brand-gold text-white border-brand-gold" 
                            : product.giftTier === "premium"
                            ? "border-brand-green-dark text-brand-green-dark"
                            : ""
                        }
                      >
                        {getGiftTierLabel(product.giftTier)}
                      </Badge>
                    </div>
                  )}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold md:text-4xl">
                      {product.name}
                    </h1>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="shrink-0 min-h-[44px]"
                    >
                      <Share2 className="ml-2 h-4 w-4" />
                      {shareDone ? "تم النسخ!" : "مشاركة"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrOpen(true)}
                      className="shrink-0 min-h-[44px]"
                    >
                      <QrCode className="ml-2 h-4 w-4" />
                      QR
                    </Button>
                  </div>
                  <div className="space-y-1 text-base text-muted-foreground">
                    <p>كود الهدية: <span className="font-semibold">{product.sku}</span></p>
                    <p>
                      العدد المتوفر:{" "}
                      <span className="font-semibold">{product.availableQuantity ?? 0}</span>
                      {isOnRecommendation ? (
                        <span className="mr-2 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-sm text-foreground">
                          على التوصية
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h2 className="mb-3 text-xl font-semibold">الوصف</h2>
                  <p className="leading-relaxed text-muted-foreground">
                    {product.shortDescription}
                  </p>
                </div>

                {product.contents.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-xl font-semibold">
                      محتويات الهدية
                    </h2>
                    <ul className="space-y-2">
                      {product.contents.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="mt-1 h-5 w-5 shrink-0 text-brand-green-dark" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                {product.catalogImage ? (
                  <>
                    <div className="space-y-3">
                      <h2 className="text-xl font-semibold">كتالوج للطباعة</h2>
                      <p className="text-sm text-muted-foreground">
                        يمكنك تنزيل صورة عالية الدقة وطباعتها.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={product.catalogImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-5 text-sm font-medium hover:bg-muted"
                        >
                          فتح صورة الكتالوج
                        </a>
                        <a
                          href={product.catalogImage}
                          download
                          className="inline-flex min-h-[44px] items-center justify-center rounded-md border px-5 text-sm font-medium hover:bg-muted"
                        >
                          تنزيل للطباعة
                        </a>
                      </div>
                    </div>
                    <Separator />
                  </>
                ) : null}

                {!isOnRecommendation ? (
                  <div className="space-y-3">
                    <p className="text-base font-medium text-muted-foreground">أضف للطلبية</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1 border rounded-md">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <span className="w-12 text-center text-lg font-semibold tabular-nums">
                          {orderQty}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          onClick={() => setOrderQty((q) => Math.min(99, q + 1))}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                      {orderAdded ? (
                        <div className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-green-600 bg-green-50 px-6 py-3 text-sm font-medium text-green-700 transition-colors duration-200">
                          <Check className="h-5 w-5 shrink-0" />
                          تمت الإضافة
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            addToOrder(product, orderQty);
                            setOrderAdded(true);
                            setTimeout(() => setOrderAdded(false), 2200);
                          }}
                          variant="outline"
                          className="min-h-[44px] border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white hover:shadow-md active:bg-brand-gold/90 px-6"
                        >
                          <ShoppingCart className="ml-2 h-5 w-5 shrink-0" />
                          أضف للطلبية
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-base font-medium">هذه الهدية على التوصية</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      العدد المتوفر حالياً 0 — تواصل معنا لطلبها بالتوصية.
                    </p>
                  </div>
                )}

                <Separator />

                <a
                  href={generateWhatsAppLink(product.name, product.sku)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-lg font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-brand-green-dark text-white hover:bg-brand-green-darker hover:shadow-md active:scale-[0.98] active:shadow-inner min-h-[44px] h-12 rounded-md px-8 touch-manipulation"
                >
                  استفسر عن الهدية
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="border-t bg-muted/30 py-16">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-bold md:text-3xl">
                  هدايا مشابهة
                </h2>
              </motion.div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
                {relatedProducts.map((relatedProduct, index) => (
                  <ProductCard
                    key={relatedProduct.slug}
                    product={relatedProduct}
                    index={index}
                    onAddToOrder={addToOrder}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

