import { Font } from "@react-pdf/renderer";

export const PDF_FONT = {
  tajawal: "Tajawal",
  amiri: "Amiri",
} as const;

let fontsRegistered = false;

/** تسجيل خطوط PDF مرة واحدة (Tajawal للواجهة، Amiri للنص العربي المشكّل). */
export function ensurePdfFontsRegistered(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;

  const fontBase =
    typeof window !== "undefined" ? `${window.location.origin}/fonts/tajawal` : "/fonts/tajawal";
  const amiriBase =
    typeof window !== "undefined" ? `${window.location.origin}/fonts/amiri` : "/fonts/amiri";

  Font.register({
    family: PDF_FONT.amiri,
    fonts: [{ src: `${amiriBase}/Amiri-Regular.ttf`, fontWeight: 400 }],
  });

  Font.register({
    family: PDF_FONT.tajawal,
    fonts: [
      { src: `${fontBase}/ArbFONTS-Tajawal-ExtraLight.ttf`, fontWeight: 200 },
      { src: `${fontBase}/ArbFONTS-Tajawal-Light.ttf`, fontWeight: 300 },
      { src: `${fontBase}/ArbFONTS-Tajawal-Regular.ttf`, fontWeight: 400 },
      { src: `${fontBase}/ArbFONTS-Tajawal-Medium.ttf`, fontWeight: 500 },
      { src: `${fontBase}/ArbFONTS-Tajawal-Bold.ttf`, fontWeight: 700 },
      { src: `${fontBase}/ArbFONTS-Tajawal-ExtraBold.ttf`, fontWeight: 800 },
      { src: `${fontBase}/ArbFONTS-Tajawal-Black.ttf`, fontWeight: 900 },
    ],
  });
}

/** أنماط نص عربي مشكّل لـ react-pdf */
export const pdfArabicTextStyle = {
  fontFamily: PDF_FONT.amiri,
  direction: "ltr" as const,
  textAlign: "right" as const,
};
