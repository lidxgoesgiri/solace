"use client";

import {
  createContext,
  useContext,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";

interface RadioGroupContextValue {
  value: string;
  firstValue: string | null;
  select: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps extends Omit<ComponentProps<"div">, "onChange" | "role"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Values in display order; the first one is focusable when nothing is chosen. */
  values: readonly string[];
  children: ReactNode;
}

const NEXT_KEYS = ["ArrowDown", "ArrowRight"];
const PREVIOUS_KEYS = ["ArrowUp", "ArrowLeft"];

/**
 * WAI-ARIA radio group with roving focus: Tab enters on the chosen item (or
 * the first), arrow keys move and choose, Space chooses. Same DOM contract
 * as the Radix group it replaces (role="radio", aria-checked, data-state),
 * without its JavaScript (PRD 14).
 */
export function RadioGroup({ value, onValueChange, values, children, ...props }: RadioGroupProps) {
  const root = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
    if (step === 0 || values.length === 0) return;
    const items = Array.from(
      root.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [],
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    event.preventDefault();
    const next = (current + step + items.length) % items.length;
    const nextValue = values[next];
    items[next]?.focus();
    if (nextValue !== undefined) onValueChange(nextValue);
  };

  return (
    <RadioGroupContext.Provider
      value={{ value, firstValue: values[0] ?? null, select: onValueChange }}
    >
      <div ref={root} role="radiogroup" onKeyDown={onKeyDown} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioItemProps extends Omit<
  ComponentProps<"button">,
  "type" | "role" | "value" | "onClick"
> {
  value: string;
}

export function RadioItem({ value, onKeyDown, ...props }: RadioItemProps) {
  const group = useContext(RadioGroupContext);
  if (!group) throw new Error("RadioItem must be inside a RadioGroup");
  const checked = group.value === value;
  const focusable = checked || (group.value === "" && group.firstValue === value);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      tabIndex={focusable ? 0 : -1}
      onClick={() => group.select(value)}
      onKeyDown={(event) => {
        // Radios choose with Space, not Enter (Enter moves on, SK-02).
        if (event.key === "Enter") event.preventDefault();
        onKeyDown?.(event);
      }}
      {...props}
    />
  );
}
