/** نصوص مساعدة ثابتة — كلمتا مرور منفصلتان على Vercel. */

export const LOGIN_PASSWORD_ENV = "ADMIN_PASSWORD";
export const PRICING_PASSWORD_ENV = "ADMIN_PRICING_PASSWORD";

export const loginPageHint =
  "لوحة التحكم (/login و /dashboard): استخدم كلمة المرور من متغير ADMIN_PASSWORD على Vercel. إن غيّرتها لاحقاً من «كلمة مرور الدخول» في لوحة التحكم (بعد ربط Postgres) تُستخدم كلمة القاعدة بدلاً من Vercel.";

export const pricingGateHint =
  "صفحة أسعار الهدايا (/admin/pricing): كلمة مرور منفصلة — متغير ADMIN_PRICING_PASSWORD على Vercel (ليست نفس ADMIN_PASSWORD).";

export const pricingGateTitle = "أسعار الهدايا — تسجيل الدخول";
