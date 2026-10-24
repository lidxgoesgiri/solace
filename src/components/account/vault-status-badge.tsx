"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "@/components/icons/shield-check";
import { Lock } from "@/components/icons/lock";
import { TextScramble } from "@/components/motion/text-scramble";
import { ACCOUNT_IDLE_MS } from "@/store/account-store";

/** Shows how the account is protected; the "unlocked" status only while signed in. */
export function VaultStatusBadge({ username }: { username?: string }) {
  const t = useTranslations("account.vault");

  return (
    <div className="glass-surface relative overflow-hidden p-5 sm:p-6 glow-sage">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-sage-ink">
            <Lock aria-hidden="true" className="size-5" />
            {username ? (
              <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 flex size-3">
                <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
            ) : null}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-sage-ink uppercase">
                {t("title")}
              </span>
              {username ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase dark:text-emerald-400">
                  {t("unlocked")}
                </span>
              ) : null}
            </div>
            <p className="font-heading text-lg font-medium text-foreground">
              {username ? (
                <span>
                  {t("signedInAs")}{" "}
                  <TextScramble text={username} duration={600} className="font-mono break-all text-primary" />
                </span>
              ) : (
                t("encrypted")
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-t sm:border-t-0 pt-3 sm:pt-0">
          <span className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3 py-1">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-sage-ink" />
            <span>{t("crypto")}</span>
          </span>
          <span className="rounded-full border border-border/80 bg-background/60 px-3 py-1">
            {t("autoLock", { minutes: ACCOUNT_IDLE_MS / 60_000 })}
          </span>
        </div>
      </div>
    </div>
  );
}
