"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { fmtRupeesGrouped, parseAmountInput } from "@/lib/format";

type AmountInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: number;
  onChange: (n: number) => void;
  max?: number;
};

function countDigits(s: string): number {
  let n = 0;
  for (const ch of s) if (ch >= "0" && ch <= "9") n++;
  return n;
}

function indexAfterNthDigit(s: string, k: number): number {
  if (k <= 0) return 0;
  let remaining = k;
  for (let i = 0; i < s.length; i++) {
    if (s[i] >= "0" && s[i] <= "9") {
      remaining--;
      if (remaining === 0) return i + 1;
    }
  }
  return s.length;
}

function displayFor(n: number): string {
  return n === 0 ? "" : fmtRupeesGrouped(n);
}

function AmountInput({
  value,
  onChange,
  max = 100_000_000,
  onFocus,
  onBlur,
  ref,
  ...rest
}: AmountInputProps) {
  const innerRef = React.useRef<HTMLInputElement | null>(null);
  const [display, setDisplay] = React.useState(() => displayFor(value));
  const [lastSyncedValue, setLastSyncedValue] = React.useState(value);
  const pendingCaret = React.useRef<number | null>(null);

  if (value !== lastSyncedValue) {
    setLastSyncedValue(value);
    if (parseAmountInput(display) !== value) {
      setDisplay(displayFor(value));
    }
  }

  React.useLayoutEffect(() => {
    const el = innerRef.current;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (el && caret !== null && document.activeElement === el) {
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        // ignore
      }
    }
  });

  const setRef = (el: HTMLInputElement | null) => {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref)
      (ref as React.RefObject<HTMLInputElement | null>).current = el;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const caretInInput = e.target.selectionStart ?? inputValue.length;
    const digitsLeftOfCaret = countDigits(inputValue.slice(0, caretInInput));

    const raw = inputValue.replace(/[^\d]/g, "");
    let n = raw === "" ? 0 : Number(raw);
    if (n > max) n = max;

    const newDisplay = displayFor(n);
    pendingCaret.current = indexAfterNthDigit(newDisplay, digitsLeftOfCaret);

    setDisplay(newDisplay);
    onChange(n);
  };

  return (
    <Input
      {...rest}
      ref={setRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={handleChange}
      onFocus={(e) => {
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setDisplay(displayFor(value));
        onBlur?.(e);
      }}
    />
  );
}

export { AmountInput };
