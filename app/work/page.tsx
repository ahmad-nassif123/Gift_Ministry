import { redirect } from "next/navigation";

/** رابط قصير للمشاركة: your-site/work → تسجيل دخول الموظفين */
export default function WorkShortLinkPage() {
  redirect("/staff/login");
}
