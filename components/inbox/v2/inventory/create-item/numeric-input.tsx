import React, { useEffect, useRef, useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";

type Props = Omit<InputProps, "value" | "onChange" | "type"> & {
  value: number | null;
  onChange?: (value: number | null) => void;
  allowNegative?: boolean;
  decimalScale?: number;
};

const toDisplay = (value: number | null) =>
  value === null || Number.isNaN(value) ? "" : String(value);

/** A figure nobody can edit reads as money does: en-IN groups, fixed places. */
const toReadOnly = (value: number | null, places: number) =>
  value === null || Number.isNaN(value)
    ? ""
    : value.toLocaleString("en-IN", {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
      });

/**
 * A number field with production's NumericInput API
 * (components/numeric-input): number | null in and out, digits and one point
 * only, an optional leading minus, `decimalScale` places. Production's own
 * component replaces this at handoff — only the import changes.
 */
const NumericInput = ({
  value,
  onChange,
  allowNegative = false,
  decimalScale = 2,
  onFocus,
  onBlur,
  ...props
}: Props) => {
  const [display, setDisplay] = useState(() => toDisplay(value));
  const focused = useRef(false);

  // While the field has focus the typed text wins ("12." must stay "12.").
  useEffect(() => {
    if (!focused.current) setDisplay(toDisplay(value));
  }, [value]);

  const pattern = new RegExp(
    `^${allowNegative ? "-?" : ""}\\d*${decimalScale > 0 ? `(\\.\\d{0,${decimalScale}})?` : ""}$`
  );

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={props.disabled ? toReadOnly(value, decimalScale) : display}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setDisplay(toDisplay(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (!pattern.test(raw)) return;
        setDisplay(raw);
        const n = Number(raw);
        onChange?.(raw === "" || raw === "-" || raw === "." ? null : n);
      }}
    />
  );
};

export default NumericInput;
