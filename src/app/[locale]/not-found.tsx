import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  const common = useTranslations("common");

  return (
    <section data-testid="not-found" className="mx-auto max-w-xl space-y-5 py-12 text-center">
      <h1 className="text-4xl leading-tight sm:text-5xl">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("body")}</p>
      <Button asChild variant="outline">
        <Link href="/">{common("backToHome")}</Link>
      </Button>
    </section>
  );
}
