import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { consumeOneTimeShareToken } from "@/lib/product-share-db";
import { getProductBySlug } from "@/lib/products-db";
import { stripProductPricesForPublic } from "@/lib/product-public";
import { getGiftTierLabel } from "@/data/products";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "عرض مخصص",
  robots: { index: false, follow: false },
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <h1 className="mb-3 text-xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground leading-relaxed">{body}</p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          >
            العودة للرئيسية
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default async function ShareOneTimePage({
  params,
}: {
  params: { token: string };
}) {
  const token = decodeURIComponent(params.token || "");
  const consumed = await consumeOneTimeShareToken(token);

  if (!consumed.ok) {
    if (consumed.reason === "no_db") {
      return (
        <Message
          title="غير متاح"
          body="لم يُضبط خادم قاعدة البيانات. تواصل مع المسؤول."
        />
      );
    }
    if (consumed.reason === "used") {
      return (
        <Message
          title="تم استخدام هذا الرابط مسبقاً"
          body="رابط العرض لمرة واحدة فقط. إذا احتجت رابطاً جديداً اطلبه من المعرض."
        />
      );
    }
    if (consumed.reason === "expired") {
      return (
        <Message
          title="انتهت صلاحية الرابط"
          body="انتهت المدة المحددة لهذا الرابط. يمكن طلب رابط جديد من المعرض."
        />
      );
    }
    return (
      <Message
        title="رابط غير صالح"
        body="تأكد من نسخ الرابط كاملاً كما أرسل لك."
      />
    );
  }

  const raw = await getProductBySlug(consumed.slug);
  if (!raw || raw.archived) {
    return (
      <Message
        title="الهدية غير متاحة"
        body="قد تكون الهدية غير معروضة حالياً أو توقف عرضها."
      />
    );
  }

  const product = stripProductPricesForPublic(raw);
  const img = product.images?.[0];
  const wa = generateWhatsAppLink(product.name, product.sku);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-muted-foreground">
            عرض خاص بك — تم تفعيل هذا الرابط للمرة الأولى الآن ولن يعمل مرة أخرى.
          </p>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {img ? (
              <div className="relative aspect-square w-full bg-white dark:bg-muted">
                <Image
                  src={img}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 672px"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  unoptimized={
                    img.includes("/archive-images/") || img.startsWith("http")
                  }
                  priority
                />
              </div>
            ) : null}
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
                {product.giftTier ? (
                  <Badge
                    variant={product.giftTier === "luxury" ? "default" : "outline"}
                    className={
                      product.giftTier === "luxury"
                        ? "bg-brand-gold text-white border-brand-gold"
                        : ""
                    }
                  >
                    {getGiftTierLabel(product.giftTier)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {product.shortDescription}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>كود: {product.sku}</span>
              </div>
              {product.contents?.length ? (
                <div>
                  <p className="mb-2 text-sm font-medium">المحتويات</p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {product.contents.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-md bg-brand-green-dark px-4 py-3 text-base font-medium text-white hover:bg-brand-green-darker"
              >
                استفسر عن الهدية (واتساب)
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
