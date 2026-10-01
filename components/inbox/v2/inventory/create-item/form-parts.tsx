import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { T } from "@/components/inbox/v2/ui";

/**
 * The stock item form's small furniture: production's ErrorMessage, its
 * "label then switch" rows, and the grey helper line under a field.
 */

export const ErrorText = ({ message }: { message?: string }) =>
  message ? (
    <span role="alert" className="text-xs text-destructive-foreground">
      {message}
    </span>
  ) : null;

export const HelperText = ({ children }: { children: React.ReactNode }) => (
  <span className={T.sub}>{children}</span>
);

export const SwitchRow = ({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-3 sm:col-span-2", className)}>
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
    <Label htmlFor={id} className={cn(T.value, "text-foreground")}>
      {label}
    </Label>
  </div>
);
