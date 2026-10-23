import { HalftoneWordmark } from "@/features/landing/halftone-wordmark";
import styles from "@/features/landing/hero-wordmark.module.css";

/** The original footer animation, composed as a non-intercepting hero layer. */
export function HeroWordmark() {
  return (
    <div aria-hidden="true" data-testid="hero-halftone" className={`pointer-events-none absolute ${styles.backdrop}`}>
      <HalftoneWordmark />
    </div>
  );
}
