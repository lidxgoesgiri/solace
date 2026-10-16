import { useTranslations } from "next-intl";

export function PageLoading() {
  const t = useTranslations("common");
  return (
    <p
      role="status"
      data-testid="page-loading"
      className="py-16 text-center text-muted-foreground"
    >
      {t("loading")}
    </p>
  );
}
