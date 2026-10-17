export type ClassValue =
  | string
  | number
  | bigint
  | null
  | undefined
  | false
  | true
  | ClassValue[]
  | { [className: string]: unknown };

function append(out: string[], value: ClassValue): void {
  if (!value || value === true) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    out.push(String(value));
  } else if (Array.isArray(value)) {
    for (const item of value) append(out, item);
  } else {
    for (const [name, on] of Object.entries(value)) if (on) out.push(name);
  }
}

/**
 * Joins class names (clsx semantics) without Tailwind conflict merging.
 * Merging cost about 10 KB of JavaScript on every page (PRD 14), so
 * components expose variants and props instead of overridable classes:
 * never pass a class that conflicts with a component's own classes.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) append(out, input);
  return out.join(" ");
}
