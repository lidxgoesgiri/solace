"use client";

import { LifeBuoy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";
import { useFlowDispatch } from "@/store/flow-store";

/**
 * "Butuh bantuan sekarang" (GL-01, K11). Opens the crisis screen in one click
 * and sets crisis_pending, so results stay gated until the user confirms.
 */
export function HelpNowButton({ className }: { className?: string }) {
  const t = useTranslations("header");
  const pathname = usePathname();
  const dispatch = useFlowDispatch();

  return (
    <Button asChild variant="warm" className={className}>
      <Link
        href={PATHS.krisis}
        data-testid="help-now"
        onClick={() => dispatch({ type: "REQUEST_HELP", from: pathname })}
      >
        <LifeBuoy aria-hidden="true" />
        {t("helpNow")}
      </Link>
    </Button>
  );
}
