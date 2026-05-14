"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { catalogStagger, catalogTransition } from "@/lib/catalog-motion";
import { ShoppingCart, Plus, Minus, Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product, getGiftTierLabel } from "@/data/products";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { formatCustomerFacingPrice, formatGiftPriceUsdLabel } from "@/lib/catalog-price-display";

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToOrder?: (product: Product, quantity?: number) => void;
  onQuickView?: (product: Product) => void;
}

export function ProductCard({ product, index = 0, onAddToOrder, onQuickView }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [showAdded, setShowAdded] = useState(false);
  const isOnRecommendation = (product.availableQuantity ?? 0) === 0;

  const handleAdd = () => {
    if (onAddToOrder && quantity >= 1) {
      onAddToOrder(product, quantity);
      setQuantity(1);
      setShowAdded(true);
      setTimeout(() => setShowAdded(false), 2200);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        ...catalogTransition,
        delay: index * catalogStagger,
      }}
      className="h-full"
    >
      <Card className="group flex h-full flex-col overflow-hidden rounded-lg shadow-sm transition-all duration-200 sm:rounded-xl sm:shadow-md sm:hover:shadow-lg sm:hover:shadow-primary/10 sm:hover:-translate-y-2">
        <Link href={`/products/${product.slug}`}>
          <CardHeader className="p-0">
            {/* جوال: صورة أقل ارتفاعاً؛ سطح المكتب: مربع */}
            <div className="relative aspect-[5/4] w-full overflow-hidden bg-white dark:bg-muted sm:aspect-square">
              {product.images && product.images.length > 0 && product.images[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain transition-transform duration-300 sm:group-hover:scale-105"
                  loading="lazy"
                  unoptimized={product.images[0].includes("/archive-images/")}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><span>لا توجد صورة</span></div>';
                    }
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                  <span className="text-xs sm:text-sm">لا توجد صورة</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Link>
        <CardContent className="flex-1 p-2 sm:p-4">
          <div className="mb-1.5 flex items-start justify-between gap-1.5 sm:mb-2 sm:gap-2">
            <Link href={`/products/${product.slug}`} className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-snug transition-colors duration-200 hover:text-brand-green-dark sm:text-xl sm:leading-tight">
                {product.name}
              </h3>
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {isOnRecommendation ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 leading-tight sm:text-xs sm:px-2.5 sm:py-0.5">
                  على التوصية
                </Badge>
              ) : null}
              {product.giftTier ? (
                <Badge
                  variant={product.giftTier === "luxury" ? "default" : "outline"}
                  className={
                    "text-[10px] px-1.5 py-0 leading-tight sm:text-xs sm:px-2.5 sm:py-0.5 " +
                    (product.giftTier === "luxury"
                      ? "bg-brand-gold text-white border-brand-gold"
                      : product.giftTier === "premium"
                      ? "border-brand-green-dark text-brand-green-dark"
                      : "")
                  }
                >
                  {getGiftTierLabel(product.giftTier)}
                </Badge>
              ) : null}
            </div>
          </div>
          {product.salePrice || product.price ? (
            <div className="mb-1 space-y-0.5 sm:mb-2">
              <p className="text-sm font-semibold text-brand-green-dark sm:text-base">
                {formatCustomerFacingPrice(product)}
              </p>
              {product.salePrice && product.price ? (
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  السعر المرجعي: {formatGiftPriceUsdLabel(product.price)}
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground sm:mb-3 sm:text-base">
            {product.shortDescription}
          </p>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1 sm:text-base">
            <span className="truncate">كود: {product.sku}</span>
            <span className="truncate">
              <span className="sm:hidden">متوفّر: </span>
              <span className="hidden sm:inline">العدد المتوفر: </span>
              {product.availableQuantity ?? 0}
            </span>
          </div>
          {onQuickView && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onQuickView(product); }}
              className="mt-0.5 text-xs font-medium text-primary hover:underline transition-colors duration-200 active:opacity-80 min-h-10 px-2 py-1 inline-flex items-center justify-center rounded-md hover:bg-primary/5 sm:mt-1 sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-sm"
            >
              عرض سريع
            </button>
          )}
        </CardContent>
        <CardFooter className="mt-auto flex flex-col gap-2 p-2 pt-0 sm:gap-3 sm:p-4">
          {onAddToOrder && !isOnRecommendation && (
            <div className="flex flex-col gap-1.5 w-full sm:gap-2">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">الكمية:</span>
                <div className="flex items-center gap-0.5 rounded-md border sm:gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 min-h-9 min-w-9 shrink-0 touch-manipulation sm:h-9 sm:w-9 sm:min-h-[44px] sm:min-w-[44px]"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <span className="w-8 text-center text-xs font-semibold tabular-nums sm:w-10 sm:text-sm">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 min-h-9 min-w-9 shrink-0 touch-manipulation sm:h-9 sm:w-9 sm:min-h-[44px] sm:min-w-[44px]"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
              {showAdded ? (
                <div className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-green-600 bg-green-50 py-2 text-xs font-medium text-green-700 transition-colors duration-200 sm:min-h-[44px] sm:gap-2 sm:py-3 sm:text-sm">
                  <Check className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  تمت الإضافة
                </div>
              ) : (
                <Button
                  onClick={handleAdd}
                  variant="outline"
                  className="h-10 w-full min-h-10 border-brand-gold text-xs text-brand-gold hover:bg-brand-gold hover:text-white hover:shadow-md active:bg-brand-gold/90 sm:min-h-[44px] sm:text-sm"
                >
                  <ShoppingCart className="ml-1 h-3.5 w-3.5 shrink-0 sm:ml-2 sm:h-4 sm:w-4" />
                  أضف للطلبية
                </Button>
              )}
            </div>
          )}
          {isOnRecommendation ? (
            <div className="w-full rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-gold/15 text-brand-gold">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">متوفرة بالتوصية</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    العدد حالياً 0 — تواصل معنا لتجهيزها حسب الطلب.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <a
            href={generateWhatsAppLink(product.name, product.sku)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 min-h-10 w-full items-center justify-center rounded-md bg-brand-green-dark px-2 py-2 text-center text-[11px] font-medium leading-tight text-white ring-offset-background transition-all duration-200 hover:bg-brand-green-darker hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] active:shadow-inner touch-manipulation sm:h-12 sm:min-h-[44px] sm:px-5 sm:text-base sm:leading-normal"
          >
            {isOnRecommendation ? "اطلبها بالتوصية" : "استفسر عن الهدية"}
          </a>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

