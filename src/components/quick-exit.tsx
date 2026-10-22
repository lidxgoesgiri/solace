"use client";

import { LogOut } from "@/components/icons/log-out";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** A neutral page with no link to Solace or to any health provider. */
export const QUICK_EXIT_URL = "https://www.google.com/";
const DOUBLE_ESCAPE_MS = 1000;

/** Replaces the current history entry, so Back does not return here (GL-02). */
function quickExit() {
  window.location.replace(QUICK_EXIT_URL);
}

export function QuickExit({ className }: { className?: string }) {
  const t = useTranslations("header");

  useEffect(() => {
    let lastEscape = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      const now = Date.now();
      if (now - lastEscape <= DOUBLE_ESCAPE_MS) {
        quickExit();
      } else {
        lastEscape = now;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-testid="quick-exit"
      aria-label={t("quickExitLabel")}
      className={className}
      onClick={quickExit}
    >
      <LogOut aria-hidden="true" />
      <span className="min-[420px]:hidden">{t("quickExitShort")}</span>
      <span className="hidden min-[420px]:inline">{t("quickExit")}</span>
    </Button>
  );
}
