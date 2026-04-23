"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  productName: string;
}

export function ImageLightbox({ images, currentIndex, onClose, onPrev, onNext, productName }: ImageLightboxProps) {
  const pushedHistoryRef = useRef(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };

    // اجعل زر الرجوع (Back) يغلق المعاينة بدل التنقل خارج صفحة المنتج
    const handlePopState = () => {
      onClose();
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    try {
      window.history.pushState({ giftCatalogLightbox: true }, "", window.location.href);
      pushedHistoryRef.current = true;
      window.addEventListener("popstate", handlePopState);
    } catch {
      // ignore
    }

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      try {
        window.removeEventListener("popstate", handlePopState);
      } catch {
        // ignore
      }
    };
  }, [onClose, onPrev, onNext]);

  const src = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const requestClose = () => {
    if (pushedHistoryRef.current) {
      try {
        window.history.back();
        return;
      } catch {
        // ignore
      }
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-label="معرض الصور"
    >
      <button
        type="button"
        onClick={requestClose}
        className="absolute left-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="إغلاق"
      >
        <X className="h-6 w-6" />
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          aria-label="السابق"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          aria-label="التالي"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      <div
        className="relative max-h-[90vh] w-full max-w-4xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {src && (
          <div className="mx-auto w-fit max-w-full rounded-lg bg-white p-2 shadow-2xl ring-1 ring-white/20">
            <Image
              src={src}
              alt={`${productName} - ${currentIndex + 1}`}
              width={1200}
              height={900}
              className="max-h-[85vh] w-auto object-contain"
              unoptimized={src.startsWith("data:")}
            />
          </div>
        )}
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
        {currentIndex + 1} / {images.length}
      </p>
    </div>
  );
}
