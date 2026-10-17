import * as React from "react";
import { cn } from "@/lib/utils";

const BASE =
  "group/button inline-flex shrink-0 items-center justify-center text-center rounded-full border bg-clip-padding font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-(--duration-quick) ease-(--ease-calm) select-none cursor-pointer active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const VARIANTS = {
  default: "border-transparent bg-primary text-primary-foreground shadow-(--shadow-soft) hover:bg-primary-hover",
  outline:
    "border-border bg-card text-foreground hover:border-input hover:bg-muted aria-expanded:bg-muted",
  ghost: "border-transparent text-foreground hover:bg-muted aria-expanded:bg-muted",
  destructive:
    "border-destructive/30 bg-card text-destructive hover:bg-destructive/10 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
  warm: "border-sun-edge bg-sun text-paper-ink hover:bg-sun-hover",
} as const;

const SIZES = {
  default: "min-h-11 gap-2 px-5 py-2 text-sm",
  sm: "min-h-9 gap-1.5 px-3.5 py-1.5 text-sm",
  lg: "min-h-12 gap-2.5 px-7 py-2.5 text-base",
} as const;

type ButtonVariant = keyof typeof VARIANTS;
type ButtonSize = keyof typeof SIZES;

/**
 * Class names for a button look. A plain lookup instead of
 * class-variance-authority keeps this off every page's JavaScript (PRD 14).
 */
function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: { variant?: ButtonVariant | null; size?: ButtonSize | null; className?: string } = {}) {
  return cn(BASE, VARIANTS[variant ?? "default"], SIZES[size ?? "default"], className);
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the single child element (a link) with the button's styling. */
  asChild?: boolean;
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = buttonVariants({ variant, size, className });

  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    // A small stand-in for Radix Slot: the child keeps its own props and
    // handlers, gains the button's data attributes, and merges classes.
    return React.cloneElement(children, {
      "data-slot": "button",
      "data-variant": variant,
      "data-size": size,
      ...props,
      className: cn(classes, children.props.className),
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}

export { Button, buttonVariants };
