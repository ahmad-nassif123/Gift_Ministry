# كتالوج الهدايا الفاخرة

موقع كتالوج هدايا تفاعلي وفخم باللغة العربية (RTL)، مناسب للجوال (Mobile-First)، مبني باستخدام Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion.

## 🚀 المميزات

- ✅ تصميم Luxury Minimalist احترافي
- ✅ دعم كامل للغة العربية (RTL)
- ✅ Mobile-First Responsive Design
- ✅ بطاقات منتجات أنيقة مع صور محسّنة
- ✅ فلاتر وبحث فوري
- ✅ صفحة تفاصيل لكل منتج
- ✅ تكامل مع واتساب برسائل جاهزة
- ✅ Animations سلسة باستخدام Framer Motion
- ✅ SEO محسّن (Meta tags, Sitemap, Robots.txt)
- ✅ Performance عالي (Lighthouse 90+)

## 📦 التقنيات المستخدمة

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (مكونات UI)
- **Framer Motion** (Animations)
- **Lucide React** (Icons)
- **Cairo Font** (خط عربي)

## 🛠️ التثبيت والتشغيل

### المتطلبات

- Node.js 18+ 
- npm أو yarn

### خطوات التثبيت

1. تثبيت الحزم:
```bash
npm install
```

2. تشغيل المشروع في وضع التطوير:
```bash
npm run dev
```

3. افتح المتصفح على:
```
http://localhost:3000
```

## 📁 بنية المشروع

```
├── app/                    # صفحات Next.js (App Router)
│   ├── layout.tsx         # Layout الرئيسي
│   ├── page.tsx           # الصفحة الرئيسية
│   ├── globals.css        # الأنماط العامة
│   ├── products/          # صفحات المنتجات
│   │   └── [slug]/        # صفحة تفاصيل المنتج
│   ├── sitemap.ts         # Sitemap
│   └── robots.ts          # Robots.txt
├── components/            # المكونات
│   ├── ui/               # مكونات shadcn/ui
│   ├── navbar.tsx        # شريط التنقل
│   ├── footer.tsx        # التذييل
│   └── product-card.tsx  # بطاقة المنتج
├── data/                 # البيانات
│   └── products.ts       # بيانات المنتجات
├── lib/                  # مكتبات مساعدة
│   ├── utils.ts          # دوال مساعدة
│   ├── whatsapp.ts       # تكامل واتساب
│   └── config.ts         # إعدادات الموقع
└── public/               # الملفات الثابتة
    └── images/           # صور المنتجات
```

## 📸 إضافة الصور

### أين نضع الصور؟

ضع صور المنتجات في المجلد:
```
public/images/
```

### تنسيق أسماء الصور

استخدم أسماء واضحة ومنظمة:
```
public/images/
  ├── السيف الدمشقي.jpg
  ├── درع معالم سوريا.jpg
  ├── مبخرة وردة دمشقية.jpg
  └── product-name-1.jpg
```

### ملاحظات مهمة

- استخدم صور عالية الجودة (يفضل 1200x1200px على الأقل)
- استخدم تنسيقات WebP أو AVIF للتحسين
- Next.js سيقوم بتحسين الصور تلقائياً

## ➕ إضافة منتج جديد

### خطوات إضافة منتج:

1. أضف صور المنتج في `public/images/`

2. افتح `data/products.ts` وأضف المنتج الجديد:

```typescript
{
  slug: "product-slug",              // رابط فريد (بالإنجليزية)
  sku: "G02",                        // كود المنتج
  name: "اسم المنتج بالعربية",       // اسم المنتج
  shortDescription: "وصف مختصر...",  // وصف المنتج
  contents: [                         // محتويات الهدية
    "عنصر 1",
    "عنصر 2",
  ],
  price: "29.99 USD",                // السعر (اختياري)
  images: [                           // مسارات الصور
    "/images/product-1.jpg",
    "/images/product-2.jpg",
  ],
}
```

### مثال كامل:

```typescript
{
  slug: "luxury-watch",
  sku: "G02",
  name: "ساعة يدوية فاخرة",
  shortDescription: "ساعة يدوية أنيقة مصنوعة من الذهب الأصفر...",
  contents: [
    "ساعة يدوية فاخرة",
    "صندوق أنيق",
    "بطاقة ضمان",
  ],
  price: "99.00 USD",
  images: [
    "/images/watch-1.jpg",
    "/images/watch-2.jpg",
  ],
}
```

## ⚙️ التخصيص

### تغيير رقم الواتساب

افتح `lib/whatsapp.ts` وعدّل:

```typescript
export const WHATSAPP_PHONE = "966501234567"; // غيّر الرقم هنا
```

**ملاحظة:** استخدم الرقم بدون رموز (مثال: `966501234567` بدلاً من `+966501234567`)

### تغيير روابط السوشيال ميديا

افتح `lib/config.ts` وعدّل:

```typescript
export const siteConfig = {
  name: "كتالوج الهدايا الفاخرة",
  description: "...",
  phone: "+966501234567",
  whatsapp: "966501234567",
  instagram: "https://instagram.com/yourhandle", // غيّر هنا
  email: "info@example.com",                      // غيّر هنا
};
```

### تغيير ألوان الهوية

افتح `tailwind.config.ts` وعدّل لون `accent`:

```typescript
colors: {
  accent: {
    DEFAULT: "#D4AF37", // ذهبي - غيّر هنا
    dark: "#B8941F",
    light: "#E8D5A3",
  },
  // ...
}
```

**ألوان مقترحة:**
- ذهبي: `#D4AF37`
- خمري: `#8B0000`
- أخضر داكن: `#2D5016`
- أزرق فاخر: `#1E3A5F`

### تغيير الخط

افتح `app/layout.tsx` وعدّل الخط:

```typescript
import { Cairo } from "next/font/google";
// أو
import { Tajawal } from "next/font/google";
// أو
import { Noto_Kufi_Arabic } from "next/font/google";
```

ثم غيّر الاستخدام:

```typescript
const font = Tajawal({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-tajawal",
});
```

## 🚀 النشر على Vercel

### خطوات النشر:

1. ارفع المشروع على GitHub

2. اذهب إلى [Vercel](https://vercel.com)

3. اضغط "New Project"

4. اختر المستودع من GitHub

5. Vercel سيكتشف Next.js تلقائياً

6. اضغط "Deploy"

### إعدادات مهمة:

- **Build Command:** `npm run build` (افتراضي)
- **Output Directory:** `.next` (افتراضي)
- **Install Command:** `npm install` (افتراضي)

### تحديث Sitemap و Robots.txt

بعد النشر، افتح `app/sitemap.ts` و `app/robots.ts` وعدّل:

```typescript
const baseUrl = "https://yourdomain.com"; // رابط موقعك على Vercel
```

## 📱 اختبار RTL والجوال

### اختبار RTL:

1. تأكد من أن `<html dir="rtl" lang="ar">` موجود في `app/layout.tsx`
2. تحقق من محاذاة النصوص من اليمين
3. تحقق من اتجاه الأيقونات (السهم يجب أن يكون معكوس)

### اختبار الجوال:

1. استخدم DevTools في المتصفح (F12)
2. فعّل "Toggle device toolbar"
3. اختر iPhone أو Android
4. تحقق من:
   - Navbar يتحول إلى Sheet Menu
   - Grid يتكيف (1 عمود على الجوال)
   - الأزرار والصور بحجم مناسب

## 🎨 المكونات المتاحة

المشروع يستخدم shadcn/ui مع المكونات التالية:

- `Button` - أزرار
- `Card` - بطاقات
- `Badge` - شارات
- `Input` - حقول إدخال
- `Sheet` - قائمة الجوال
- `Separator` - فاصل
- `Skeleton` - تحميل

يمكنك إضافة المزيد من [shadcn/ui](https://ui.shadcn.com)

## 📝 ملاحظات إضافية

- جميع الصور تستخدم `next/image` للتحسين التلقائي
- الصور تُحمّل بشكل lazy ما عدا Hero image
- الرسوم المتحركة خفيفة ولا تؤثر على الأداء
- الموقع محسّن لـ SEO مع Meta tags كاملة

## 🐛 حل المشاكل

### المشكلة: الصور لا تظهر

**الحل:** تأكد من:
- الصور موجودة في `public/images/`
- المسار يبدأ بـ `/images/` (مثال: `/images/product.jpg`)
- اسم الملف مطابق تماماً (حساس لحالة الأحرف)

### المشكلة: واتساب لا يعمل

**الحل:** تأكد من:
- رقم الواتساب بدون رموز (`966501234567`)
- الرقم يبدأ برمز الدولة (مثال: `966` للسعودية)

### المشكلة: الخطوط لا تظهر

**الحل:** تأكد من:
- الاتصال بالإنترنت (الخطوط من Google Fonts)
- الخط محمّل في `app/layout.tsx`

## 📄 الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام الحر.

## 🤝 المساهمة

نرحب بأي مساهمات! يرجى فتح Issue أو Pull Request.

---

**صُنع بـ ❤️ باستخدام Next.js**

