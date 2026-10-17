"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useOpenAccount } from "@/components/account/use-account";
import { LogIn } from "@/components/icons/log-in";
import { Lock } from "@/components/icons/lock";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";

interface AccountGateProps {
  /** Where to come back after signing in. */
  next: typeof PATHS.tips | typeof PATHS.riwayat;
  children: (username: string) => ReactNode;
}

/**
 * Shows its content only to a signed-in account (PRD 7: tips and history
 * need an account); otherwise an invitation to sign in or sign up.
 */
export function AccountGate({ next, children }: AccountGateProps) {
  const t = useTranslations("account");
  const username = useOpenAccount();
  if (username) return <>{children(username)}</>;

  return (
    <section
      aria-labelledby="account-required-title"
      data-testid="account-required"
      className="surface mx-auto max-w-2xl space-y-4 p-6 sm:p-8"
    >
      <Lock aria-hidden="true" className="size-6 text-sage-ink" />
      <h1 id="account-required-title" className="text-3xl">
        {t("required")}
      </h1>
      <p className="measure leading-relaxed text-muted-foreground">{t("requiredBody")}</p>
      <p className="text-sm text-muted-foreground">{t("noEmail")}</p>
      <div className="flex flex-wrap gap-3 pt-1">
        <Button asChild>
          <Link href={`${PATHS.masuk}?next=${encodeURIComponent(next)}`} data-testid="go-sign-in">
            <LogIn aria-hidden="true" />
            {t("signIn")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={PATHS.daftar} data-testid="go-sign-up">
            {t("signUp")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
