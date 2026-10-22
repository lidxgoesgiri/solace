import styles from "@/features/landing/hero-wordmark.module.css";

/** Decorative, server-rendered halftone: no canvas, event layer, or client JS. */
export function HeroWordmark() {
  return (
    <div aria-hidden="true" className={styles.backdrop}>
      <span className={styles.word}>solace</span>
    </div>
  );
}
