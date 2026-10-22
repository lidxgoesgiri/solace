/** Landing-only timing: longer settles, short coordinated stagger, no bounce. */
export const LANDING_EASE = [0.22, 1, 0.36, 1] as const;
export const LANDING_REVEAL = { duration: 0.62, ease: LANDING_EASE };
export const LANDING_SPRING = { stiffness: 75, damping: 22, mass: 0.8 };
export const LANDING_STAGGER = 0.1;
