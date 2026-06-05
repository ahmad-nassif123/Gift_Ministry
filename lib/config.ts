/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  الشعار — من هنا تغيّر الشعار متى شئت (مكان واحد)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  أ) ضع ملف الصورة داخل المجلد: public/
 *     مثال: public/شعاري.png  ←  المسار في الموقع يصبح /شعاري.png
 *
 *  ب) حدّد المسار في الأسطر التالية:
 *     - إمّا غيّر القيمة الافتراضية في defaultLogoPath أدناه
 *     - أو أنشئ ملف .env.local (انظر .env.example) واضبط:
 *       NEXT_PUBLIC_SITE_LOGO_PATH=/شعاري.png
 *       (يبدأ المسار دائماً بـ /)
 *
 *  ج) الشعار الأفقي (الرأس + الصفحة الرئيسية + PDF): logoPath أدناه.
 *
 *  د) أيقونة الدرع (تبويب المتصفح + اختصار التطبيق PWA): iconPath أدناه.
 *     ضع ملف الأيقونة في public/ (مثال: public/new-logo-icon.ico) ويفضّل
 *     أيضاً نسخها إلى app/icon.ico ليستخدمها Next كـ favicon.
 *
 *  هـ) ملفات PDF تقرأ pdfLogoPath (افتراضيًا /logo_pdf.png).
 * ═══════════════════════════════════════════════════════════════════════════
 */
const defaultLogoPath = "/logo.png";
const defaultPdfLogoPath = "/logo.png";
const defaultIconPath = "/icon.ico";

function resolveLogoPath(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_LOGO_PATH?.trim()
      : undefined;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return defaultLogoPath;
}

function resolveIconPath(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_ICON_PATH?.trim()
      : undefined;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return defaultIconPath;
}

function resolvePdfLogoPath(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_PDF_LOGO_PATH?.trim()
      : undefined;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return defaultPdfLogoPath;
}

export const siteConfig = {
  name: "كتالوج الهدايا الفاخرة",
  description: "معرض للهدايا الفاخرة والتراثية",
  logoPath: resolveLogoPath(),
  /** شعار خاص بملفات الـPDF */
  pdfLogoPath: resolvePdfLogoPath(),
  /** أيقونة مربعة/درع — تبويب المتصفح وmanifest التطبيق (ليس الشعار الأفقي) */
  iconPath: resolveIconPath(),
  /** نص يظهر عند تعطيل الصور أو قارئ الشاشة */
  logoAlt:
    "شعار إدارة التأهيل والتدريب — Training and Qualification Directorate",
  phone: "+963991307978",
  telegram: "Mojahd_N",
  telegramUrl: "https://t.me/Mojahd_N",
  instagram: "https://instagram.com/yourhandle",
  email: "info@example.com",
  /** رسالة الشريط العلوي (اتركها فارغة لإخفاء الشريط) */
  announcement: "مواعيد استلام الطلبات: الأحد - الخميس من 8 صباحاً حتى 2 عصراً. نرحب بكم.",
  /** آخر موعد للطلب لاستلام في تاريخ محدد (يُعرض في الواجهة). اتركه فارغاً لعدم الإظهار. */
  deliveryDeadlineText: "يرجى العلم أن استلام الطلب يتم بعد خمسة أيام من تاريخ إرسال الطلب.",
  /** عدد الأيام بعد اليوم لحساب تاريخ الاستلام الديناميكي (مثلاً 5 = استلام بعد 5 أيام). */
  deliveryDaysOffset: 5,
};

