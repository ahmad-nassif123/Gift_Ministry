import { CatalogPageContent } from "@/components/catalog-page-content";
import { PrivateCatalogGate } from "@/components/private-catalog-gate";

export default function PrivateCatalogPage() {
  return (
    <PrivateCatalogGate>
      <CatalogPageContent
        scope="private"
        title="الهدايا الخاصة"
        description="مجموعة الهدايا الكاملة — العامة والخاصة — متاحة بعد تسجيل الدخول"
        productsSectionId="private-products"
      />
    </PrivateCatalogGate>
  );
}
