import { useTranslations } from "next-intl";

export function PageLoading() {
  const t = useTranslations("common");
  return (
    <p
      role="status"
      data-testid="page-loading"
      className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground"
    >
      <span
        aria-hidden="true"
        className="size-3 rounded-full bg-sun-edge"
        style={{ animation: "settle 1.6s var(--ease-calm) infinite" }}
      />
      {t("loading")}
    </p>
  );
}
