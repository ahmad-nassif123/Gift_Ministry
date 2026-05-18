/** مكاتب القسم — تطابق نموذج Microsoft Forms */
export const STAFF_OFFICES = [
  { code: "official_gifts", label: "الهدايا الرسمية" },
  { code: "technical_works", label: "مكتب الأعمال الفنية" },
  { code: "design", label: "مكتب التصميم" },
  { code: "quality", label: "مكتب الجودة" },
  { code: "finance_admin", label: "مكتب المالي و الإداري" },
  { code: "printing", label: "مكتب الطباعة" },
  { code: "communication", label: "مكتب التواصل والتنسيق" },
] as const;

export type StaffOfficeCode = (typeof STAFF_OFFICES)[number]["code"];

export function getStaffOfficeLabel(code: string): string {
  return STAFF_OFFICES.find((o) => o.code === code)?.label ?? code;
}

export function isValidStaffOfficeCode(code: string): code is StaffOfficeCode {
  return STAFF_OFFICES.some((o) => o.code === code);
}
