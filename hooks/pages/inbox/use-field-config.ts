import { useSyncExternalStore } from "react";
import {
  fieldConfigDefaults,
  type FieldConfig,
} from "@/config/pages/inbox/additional-fields";

/**
 * Each company's sales Field Configuration — which optional groups, and which
 * fields inside them, a sales invoice carries.
 *
 * One setting with two editors. The AR sheet's Field Configuration dialog and
 * the sales upload's Map Fields page both read and write it here, so turning
 * Order Details on in either place makes it mappable on the upload and
 * enterable on the invoice. The sheet is told it on every boot (the context
 * message) and hands it back when its own dialog saves.
 *
 * In memory only, as the rest of the prototype is: a reload starts over.
 *
 * DEV: GET/PUT the company's AR voucher field configuration.
 */

let configs: Record<string, FieldConfig> = {};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const defaults = fieldConfigDefaults();

export const getFieldConfig = (company: string): FieldConfig =>
  configs[company] ?? defaults;

export const setFieldConfig = (company: string, config: FieldConfig) => {
  configs = { ...configs, [company]: config };
  listeners.forEach((listener) => listener());
};

export const useFieldConfig = (company: string) =>
  useSyncExternalStore(
    subscribe,
    () => getFieldConfig(company),
    () => getFieldConfig(company)
  );
