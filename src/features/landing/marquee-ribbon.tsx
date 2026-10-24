import { useTranslations } from "next-intl";
import { ClipboardList } from "@/components/icons/clipboard-list";
import { FileText } from "@/components/icons/file-text";
import { HeartHandshake } from "@/components/icons/heart-handshake";
import { Lock } from "@/components/icons/lock";
import { ShieldCheck } from "@/components/icons/shield-check";
import { UserRoundX } from "@/components/icons/user-round-x";
import styles from "./marquee-ribbon.module.css";

const ITEMS = [
  { key: "dass21", icon: ClipboardList },
  { key: "privacy", icon: Lock },
  { key: "noAccount", icon: UserRoundX },
  { key: "pdf", icon: FileText },
  { key: "encryption", icon: ShieldCheck },
  { key: "support", icon: HeartHandshake },
] as const;

export function MarqueeRibbon() {
  const t = useTranslations("landing");

  const renderTrack = (ariaHidden?: boolean) => (
    <div className={styles.track} aria-hidden={ariaHidden}>
      {ITEMS.map(({ key, icon: Icon }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-sage-ink">
            <Icon aria-hidden="true" className="size-3.5" />
          </span>
          <span className="text-xs font-medium tracking-wide text-foreground/85 whitespace-nowrap sm:text-sm">
            {t(`marquee.${key}`)}
          </span>
          <span className="size-1 rounded-full bg-border/80" aria-hidden="true" />
        </div>
      ))}
    </div>
  );

  return (
    <aside
      aria-label={t("marquee.label")}
      data-testid="landing-marquee"
      className="full-bleed border-y border-border/70 bg-card/40 py-3 backdrop-blur-xs transition-colors hover:bg-card/70"
    >
      <div className={styles.container}>
        {renderTrack()}
        {renderTrack(true)}
      </div>
    </aside>
  );
}
