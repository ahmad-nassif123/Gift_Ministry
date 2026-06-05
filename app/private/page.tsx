import { CatalogPageContent } from "@/components/catalog-page-content";

export default function PrivateCatalogPage() {
  return (
    <CatalogPageContent
      scope="private"
      title="الهدايا الخاصة"
      description="مجموعة هدايا مخصصة تعرض في هذا القسم فقط"
      productsSectionId="private-products"
    />
  );
}
