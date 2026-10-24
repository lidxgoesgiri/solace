"use client";

import { ShieldCheck } from "@/components/icons/shield-check";
import { Lock } from "@/components/icons/lock";
import { TextScramble } from "@/components/motion/text-scramble";

export function VaultStatusBadge({ username }: { username?: string }) {
  return (
    <div className="glass-surface relative overflow-hidden p-5 sm:p-6 glow-sage">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-sage-ink">
            <Lock aria-hidden="true" className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-sage-ink uppercase">
                Zero-Knowledge Vault
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                ACTIVE
              </span>
            </div>
            <p className="font-heading text-lg font-medium text-foreground">
              {username ? (
                <span>
                  Kunci Pribadi: <TextScramble text={username} duration={600} className="font-mono text-primary" />
                </span>
              ) : (
                "End-to-End Encrypted (No Email)"
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-t sm:border-t-0 pt-3 sm:pt-0">
          <span className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-3 py-1">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-sage-ink" />
            <span>Argon2id + Libsodium</span>
          </span>
          <span className="rounded-full border border-border/80 bg-background/60 px-3 py-1">
            30m Idle Auto-Lock
          </span>
        </div>
      </div>
    </div>
  );
}
