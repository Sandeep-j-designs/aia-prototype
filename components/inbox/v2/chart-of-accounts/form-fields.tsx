import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ComboBox } from "@/components/common/combo-box";
import RupeeInput from "@/components/common/rupee-input";
import { cn } from "@/lib/utils";
import { DR_CR_OPTIONS } from "@/config/pages/inbox/chart-of-accounts";
import type { LedgerFormValues } from "@/schemas/inbox/chart-of-accounts";
import type { Option } from "@/types/pages/inbox/chart-of-accounts";
import { DateField, Field, Req, T } from "@/components/inbox/v2/ui";

/**
 * The ledger form's field vocabulary: one shape per control, so the eight
 * forms differ only in which fields they draw. Production's equivalents are
 * FormLabel + Controller + ErrorMessage, repeated per field.
 */

/** A dotted path into the form values ("name", "gstDetails.0.gstin"). */
export type FieldName = string;

export type FormApi = {
  values: LedgerFormValues;
  /** Write one value; re-validates once the form has been submitted. */
  set: (name: FieldName, value: unknown) => void;
  /** The field's message, once Save has been pressed. */
  error: (name: FieldName) => string | undefined;
};

/** Read a dotted path out of the values. */
export const valueAt = (values: LedgerFormValues, name: FieldName): unknown =>
  name
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      values
    );

const ErrorText = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="text-xs leading-4 text-destructive-foreground">
      {message}
    </p>
  ) : null;

const Label = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <>
    {required ? <Req /> : null}
    {children}
  </>
);

const idOf = (name: FieldName) => `coa-${name.replace(/\./g, "-")}`;

type TextFieldProps = {
  f: FormApi;
  name: FieldName;
  label: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Strip what the field never accepts, as production's onChange does. */
  filter?: (raw: string) => string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
  /** "+91" ahead of a phone number. */
  prefix?: string;
  /** "days" or "%" after the figure. */
  suffix?: string;
  /** Span both columns of the card. */
  wide?: boolean;
  multiline?: boolean;
};

export const TextField = ({
  f,
  name,
  label,
  required,
  placeholder,
  disabled,
  filter,
  maxLength,
  inputMode,
  type = "text",
  prefix,
  suffix,
  wide,
  multiline,
}: TextFieldProps) => {
  const message = f.error(name);
  const value = String(valueAt(f.values, name) ?? "");
  const id = idOf(name);
  const change = (raw: string) => f.set(name, filter ? filter(raw) : raw);
  return (
    <Field
      label={<Label required={required}>{label}</Label>}
      htmlFor={id}
      hint={<ErrorText message={message} />}
      className={cn(wide && "sm:col-span-2")}
    >
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!message}
          onChange={(e) => change(e.target.value)}
          className={cn(
            "min-h-[72px] text-body-3",
            message && "border-destructive-foreground"
          )}
        />
      ) : (
        <div className="relative">
          {prefix ? (
            <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm text-secondary-foreground">
              {prefix}
            </span>
          ) : null}
          <Input
            id={id}
            type={type}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            inputMode={inputMode}
            aria-invalid={!!message}
            data-invalid={!!message}
            onChange={(e) => change(e.target.value)}
            className={cn(prefix && "pl-11", suffix && "pr-12")}
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-secondary-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
      )}
    </Field>
  );
};

/** production's WholeNumberInputField: up to 3 digits and 2 decimals, ≤ max. */
export const rateFilter =
  (max = 100) =>
  (previous: string) =>
  (raw: string) => {
    const next = raw.trim();
    if (!next) return "";
    if (!/^\d{0,3}(\.\d{0,2})?$/.test(next)) return previous;
    const parsed = Number.parseFloat(next);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > max) return previous;
    return next;
  };

export const RateField = ({
  f,
  name,
  label,
  required,
  placeholder,
  disabled,
  suffix = "%",
  max = 100,
}: {
  f: FormApi;
  name: FieldName;
  label: string;
  required?: boolean;
  placeholder: string;
  disabled?: boolean;
  suffix?: string;
  max?: number;
}) => (
  <TextField
    f={f}
    name={name}
    label={label}
    required={required}
    placeholder={placeholder}
    disabled={disabled}
    inputMode="decimal"
    maxLength={6}
    suffix={suffix}
    filter={rateFilter(max)(String(valueAt(f.values, name) ?? ""))}
  />
);

type ComboFieldProps = {
  f: FormApi;
  name: FieldName;
  label: string;
  title: string;
  options: Option[];
  optionGroups?: { label?: React.ReactNode; options: Option[] }[];
  required?: boolean;
  disabled?: boolean;
  hasSearch?: boolean;
  hideClearButton?: boolean;
  /** Runs after the value is written — for fields that clear others. */
  onPicked?: (value: string) => void;
  wide?: boolean;
};

export const ComboField = ({
  f,
  name,
  label,
  title,
  options,
  optionGroups,
  required,
  disabled,
  hasSearch,
  // The shared ComboBox draws its clear button inside the trigger button,
  // which React flags as nested buttons; every ledger field opts out.
  hideClearButton = true,
  onPicked,
  wide,
}: ComboFieldProps) => {
  const message = f.error(name);
  return (
    <Field
      label={<Label required={required}>{label}</Label>}
      hint={<ErrorText message={message} />}
      className={cn(wide && "sm:col-span-2")}
    >
      <ComboBox
        id={idOf(name)}
        title={title}
        options={options}
        optionGroups={optionGroups}
        selectedValue={String(valueAt(f.values, name) ?? "")}
        onChange={(value) => {
          const next = String(Array.isArray(value) ? (value[0] ?? "") : value);
          f.set(name, next);
          onPicked?.(next);
        }}
        isMultiSelect={false}
        disabled={disabled}
        hasSearch={hasSearch ?? options.length > 8}
        hideClearButton={hideClearButton}
        invalid={!!message}
        triggerClassName="w-full"
      />
    </Field>
  );
};

/** A labelled switch on one line, as production's Additional Fields draw it. */
export const SwitchRow = ({
  label,
  checked,
  onChange,
  disabled,
  error,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
}) => (
  <div className="flex flex-col gap-1.5 sm:col-span-2">
    <label className="flex items-center justify-between gap-4">
      <span className={cn(T.value, "text-foreground")}>{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-invalid={!!error}
      />
    </label>
    <ErrorText message={error} />
  </div>
);

/** "Set/Alter HSN Code" and its kin: the label first, the switch after it. */
export const InlineSwitch = ({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <label className="flex items-center gap-3 sm:col-span-2">
    <span className={T.label}>{label}</span>
    <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
  </label>
);

export const DateInputField = ({
  f,
  name,
  label,
}: {
  f: FormApi;
  name: FieldName;
  label: string;
}) => (
  <Field label={label} hint={<ErrorText message={f.error(name)} />}>
    <DateField
      id={idOf(name)}
      value={String(valueAt(f.values, name) ?? "").slice(0, 10)}
      onChange={(iso) => f.set(name, iso)}
    />
  </Field>
);

/** Opening Balance: the rupee figure and a Dr/Cr segmented control. */
export const OpeningBalanceFields = ({
  f,
  required,
}: {
  f: FormApi;
  required?: boolean;
}) => (
  <>
    <Field
      label={<Label required={required}>Opening Balance</Label>}
      hint={<ErrorText message={f.error("openingBalanceAmount")} />}
    >
      <RupeeInput
        aria-label="Opening Balance"
        value={Number(f.values.openingBalanceAmount || 0)}
        onChange={(value) => f.set("openingBalanceAmount", String(value))}
        hasError={!!f.error("openingBalanceAmount")}
      />
    </Field>
    <Field label="Dr/Cr">
      <Tabs
        value={f.values.drCr}
        onValueChange={(value) => f.set("drCr", value)}
      >
        <TabsList
          aria-label="Dr/Cr"
          className="flex h-9 w-full rounded-md border border-input bg-transparent p-0"
        >
          {DR_CR_OPTIONS.map((option, index) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn(
                "h-full flex-1 rounded-none text-sm font-semibold text-secondary-foreground data-[state=active]:bg-secondary data-[state=active]:text-primary data-[state=active]:shadow-none",
                index === 0 && "rounded-l-md border-r border-input",
                index === DR_CR_OPTIONS.length - 1 && "rounded-r-md"
              )}
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </Field>
  </>
);

/** Digits only, cut to a length — production's filterNumberOnly. */
export const digits = (max: number) => (raw: string) =>
  raw.replace(/\D/g, "").slice(0, max);

/** production's filterGst / filterPan: upper-case alphanumerics. */
export const upperAlnum = (max: number) => (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, max);
