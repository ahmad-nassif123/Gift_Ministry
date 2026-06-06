import { CatalogPageContent } from "@/components/catalog-page-content";
import { PrivateCatalogGate } from "@/components/private-catalog-gate";

export default function PrivateCatalogPage() {
  return (
    <PrivateCatalogGate>
      <CatalogPageContent
        scope="private"
        title="الهدايا الخاصة"
        description="مجموعة هدايا مخصصة تعرض في هذا القسم فقط"
        productsSectionId="private-products"
      />
    </PrivateCatalogGate>
  );
}
