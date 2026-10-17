import { getTranslations } from "next-intl/server";
import { Moon } from "@/components/icons/moon";
import { Sun } from "@/components/icons/sun";
import { Button } from "@/components/ui/button";
import { THEME_TOGGLE_ATTRIBUTE } from "@/lib/theme";

/**
 * Switches between light and dark mode. A server component with no click
 * handler of its own: the inline theme script in the layout listens for
 * clicks on it, so this adds no JavaScript to any page (PRD 14). The label
 * names the mode it switches to; CSS shows the right one.
 */
export async function ThemeSwitch({ className }: { className?: string }) {
  const t = await getTranslations("header");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-testid="theme-switch"
      className={className}
      {...{ [THEME_TOGGLE_ATTRIBUTE]: "" }}
    >
      <span className="theme-when-light">
        <Moon aria-hidden="true" />
        <span className="sr-only lg:not-sr-only">{t("themeDark")}</span>
      </span>
      <span className="theme-when-dark">
        <Sun aria-hidden="true" />
        <span className="sr-only lg:not-sr-only">{t("themeLight")}</span>
      </span>
    </Button>
  );
}
