"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Product, getGiftTierLabel } from "@/data/products";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";

export function ProductListItem({
  product,
  onAddToOrder,
  onQuickView,
}: {
  product: Product;
  onAddToOrder?: (product: Product, quantity?: number) => void;
  onQuickView?: (product: Product) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [showAdded, setShowAdded] = useState(false);
  const isOnRecommendation = (product.availableQuantity ?? 0) === 0;

  const handleAdd = () => {
    if (!onAddToOrder || quantity < 1) return;
    onAddToOrder(product, quantity);
    setQuantity(1);
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 2200);
  };

  return (
    <div className="rounded-xl border bg-background p-3 sm:p-4 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href={`/products/${product.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-muted sm:h-24 sm:w-24">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="96px"
              className="object-contain"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/products/${product.slug}`}>
                <h3 className="truncate text-lg font-semibold transition-colors duration-200 hover:text-brand-green-dark">
                  {product.name}
                </h3>
              </Link>
              <p className="mt-1 text-sm text-muted-foreground truncate">
                كود: {product.sku} · العدد: {product.availableQuantity ?? 0}
                {isOnRecommendation ? " · على التوصية" : ""}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {isOnRecommendation ? (
                <Badge variant="secondary">على التوصية</Badge>
              ) : null}
              {product.giftTier ? (
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
              ) : null}
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {onQuickView ? (
              <button
                type="button"
                onClick={() => onQuickView(product)}
                className="min-h-[44px] px-3 py-2 text-sm font-medium text-primary rounded-md transition-colors duration-200 hover:bg-primary/5 hover:underline"
              >
                عرض سريع
              </button>
            ) : (
              <span />
            )}

            {onAddToOrder && !isOnRecommendation ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {showAdded ? (
                  <div className="min-h-[44px] inline-flex items-center gap-2 rounded-md border border-green-600 bg-green-50 px-4 text-sm font-medium text-green-700">
                    <Check className="h-4 w-4" />
                    تمت الإضافة
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white hover:shadow-md active:bg-brand-gold/90"
                    onClick={handleAdd}
                  >
                    <ShoppingCart className="ml-2 h-4 w-4" />
                    أضف للطلبية
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

