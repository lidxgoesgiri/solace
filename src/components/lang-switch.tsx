"use client";

import { Languages } from "@/components/icons/languages";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * ID ↔ EN without a page reload (GL-03, SK-07). Answers live in the store, so
 * switching mid-screening keeps them (K9). next-intl's locale cookie
 * remembers the choice.
 */
export function LangSwitch() {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const target = locale === "id" ? "en" : "id";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-testid="lang-switch"
      aria-label={t("langSwitchLabel")}
      aria-busy={isPending}
      onClick={() =>
        startTransition(() => {
          router.replace(pathname, { locale: target, scroll: false });
        })
      }
    >
      <Languages aria-hidden="true" className="max-[359px]:hidden" />
      {t("langSwitch")}
    </Button>
  );
}
