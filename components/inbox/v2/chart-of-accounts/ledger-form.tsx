import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_UNDER_SLUG,
  FORM4_DUTY_TAX_ALLOWED_UNDER,
  FORM4_TYPE_OF_SUPPLY_OPTIONS,
  FORM5_DUTY_TAX_ALLOWED_UNDER,
  FORM5_INVENTORY_ALLOWED_UNDER,
  FORM5_INVENTORY_ENABLED_BY_DEFAULT_UNDER,
  FORM5_TYPE_OF_LEDGER_OPTIONS,
  FORM5_TYPE_OF_SUPPLY_OPTIONS,
  GST_APPLICABILITY,
  TAXABILITY_TYPES,
  TAX_REGISTRATION_EXCLUDED_UNDER,
  TYPE_OF_DUTY_TAX_OPTIONS,
  TYPE_OF_DUTY_TAX_OPTIONS_WITH_OTHERS,
  YES_NO,
  getFormTypeForUnder,
  getUnderSlugForSelection,
} from "@/config/pages/inbox/chart-of-accounts";
import {
  coaActions,
  useChartOfAccounts,
} from "@/hooks/pages/inbox/use-chart-of-accounts";
import {
  LEDGER_FORM_DEFAULTS,
  ledgerFormSchema,
  type LedgerFormValues,
} from "@/schemas/inbox/chart-of-accounts";
import type { FormType } from "@/types/pages/inbox/chart-of-accounts";
import {
  detailToFormValues,
  formValuesToDetail,
} from "@/utils/pages/inbox/chart-of-accounts";
import { FieldCard, Notice, PageButton, T } from "@/components/inbox/v2/ui";
import { ComboField, SwitchRow, type FormApi } from "./form-fields";
import {
  AddressSection,
  BankAccountSection,
  BasicDetailsSection,
  DutyTaxesSection,
  Form6DutySection,
  OpeningBalanceSection,
  StatutorySection,
  TaxRegistrationSection,
  isYes,
  yesNo,
} from "./form-sections";
import {
  DocumentsSection,
  PartyDetailsSection,
  PartyDetailsTabs,
  tabOfField,
  type PartyTab,
} from "./party-sections";

/**
 * New Ledger / Edit Ledger — a full page.
 *
 * Production: components/accounting-masters/create-ledger/* with the eight
 * forms in components/accounting-masters/forms. The group picked in "Under"
 * decides which form draws (UNDER_SLUG_TO_FORM_TYPE); changing it redraws the
 * matching form and keeps every value already typed.
 *
 * DEV: create is POST /api/accounting-masters/customer-accounts-v2, update is
 * PUT /api/accounting-masters/customer-accounts-v2/{ledgerUuid}; the body is
 * buildForm1…8LedgerPayload's (utils/pages/accounting-masters).
 */

type Props = {
  company: string;
  /** Absent for New Ledger. */
  ledgerId?: string;
  onBack: () => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  onUnbuilt: (what: string) => void;
};

/** DEV: GET /api/accounts/company-feature?companyId=… (cost centre flag). */
const COST_CENTRE_ENABLED = true;

/** Flatten rhf's nested errors to "path" → message. */
const flattenErrors = (
  errors: FieldErrors<LedgerFormValues>,
  prefix = ""
): [string, string][] =>
  Object.entries(errors ?? {}).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!value || typeof value !== "object") return [];
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" && message
      ? [[path, message] as [string, string]]
      : flattenErrors(value as FieldErrors<LedgerFormValues>, path);
  });

const LedgerForm = ({
  company,
  ledgerId,
  onBack,
  notify,
  onUnbuilt,
}: Props) => {
  const { groups, ledgers, underOptions } = useChartOfAccounts(company);
  const existing = ledgerId
    ? ledgers.find((l) => l.accountUuid === ledgerId)
    : undefined;

  const defaultUnder =
    underOptions.find((o) => o.underSlug === DEFAULT_UNDER_SLUG)?.value ?? "";
  const initialValues = useMemo<LedgerFormValues>(
    () =>
      existing
        ? detailToFormValues(existing)
        : { ...structuredClone(LEDGER_FORM_DEFAULTS), under: defaultUnder },
    []
  );

  // The schema checks the current form's fields only, so it is read from a
  // ref the resolver sees at submit time.
  const schemaContext = useRef({
    formType: "form-1" as FormType,
    underSlug: "",
  });
  const form = useForm<LedgerFormValues>({
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: (values, context, options) =>
      zodResolver(ledgerFormSchema(schemaContext.current))(
        values,
        context,
        options
      ),
  });
  const values = form.watch();
  const submitted = form.formState.isSubmitted;
  const errorList = flattenErrors(form.formState.errors);
  const errorMap = new Map(errorList);

  const underSlug = getUnderSlugForSelection(values.under, underOptions);
  const formType = getFormTypeForUnder(values.under, underOptions);
  schemaContext.current = { formType, underSlug };

  const f: FormApi = {
    values,
    set: (name, value) =>
      form.setValue(name as keyof LedgerFormValues, value as never, {
        shouldDirty: true,
        shouldValidate: submitted,
      }),
    error: (name) => errorMap.get(name),
  };

  const [partyTab, setPartyTab] = useState<PartyTab>("gst-details");

  /* ---- production's per-form effects, gathered in one place ---- */
  const taxRegistration = !TAX_REGISTRATION_EXCLUDED_UNDER.includes(underSlug);
  const duty = isYes(values.behaveAsDutiesTaxesLedger);
  const dutyAllowed =
    formType === "form-4"
      ? FORM4_DUTY_TAX_ALLOWED_UNDER.includes(underSlug)
      : FORM5_DUTY_TAX_ALLOWED_UNDER.includes(underSlug);
  const inventoryAllowed = FORM5_INVENTORY_ALLOWED_UNDER.includes(underSlug);
  const gstApplicable =
    values.gstApplicability === GST_APPLICABILITY.APPLICABLE;

  const setIf = (name: keyof LedgerFormValues, next: unknown) => {
    if (values[name] !== next) f.set(name, next);
  };

  const previousFormType = useRef(formType);
  useEffect(() => {
    // A form's own defaults, applied as production's draft merge does.
    if (previousFormType.current === formType) return;
    previousFormType.current = formType;
    // Messages belong to the form that raised them; after Save, re-check
    // against the form now on screen.
    form.clearErrors();
    if (submitted) void form.trigger();
    if (formType === "form-6" && !values.taxabilityType)
      setIf("taxabilityType", TAXABILITY_TYPES.TAXABLE);
  }, [formType]);

  useEffect(() => {
    // form-5: Purchase and Sales ledgers move stock by default.
    if (ledgerId || formType !== "form-5") return;
    if (FORM5_INVENTORY_ENABLED_BY_DEFAULT_UNDER.includes(underSlug)) {
      setIf("inventoryValuesAffected", YES_NO.YES);
      setIf("maintainBalancesBillByBill", YES_NO.NO);
    }
  }, [underSlug]);

  useEffect(() => {
    if (formType !== "form-4" && formType !== "form-5") return;
    if (!dutyAllowed && duty) setIf("behaveAsDutiesTaxesLedger", YES_NO.NO);
    if (formType === "form-5" && !inventoryAllowed)
      setIf("inventoryValuesAffected", YES_NO.NO);
    if (duty || !gstApplicable) {
      setIf("setAlterHsnSac", false);
      setIf("setAlterTaxabilityRate", false);
    }
    // form-4: an applicable GST ledger carries no registration of its own.
    if (formType === "form-4" && gstApplicable) {
      setIf("gstTreatmentUuid", "");
      setIf("gstTreatment", "");
      setIf("gstinUin", "");
    }
  }, [formType, dutyAllowed, duty, gstApplicable, inventoryAllowed]);

  useEffect(() => {
    if (taxRegistration) return;
    setIf("gstTreatmentUuid", "");
    setIf("gstTreatment", "");
    setIf("gstinUin", "");
    if (formType === "form-4") setIf("panItNo", "");
  }, [taxRegistration]);

  /* ------------------------------------------------------------------ save */
  const save = form.handleSubmit(
    (data) => {
      const group = groups.find((g) => g.ledgerGroupUuid === data.under);
      if (!group) {
        notify("Failed to save ledger", "error");
        return;
      }
      coaActions.saveLedger(
        company,
        formValuesToDetail({
          values: data,
          formType,
          group,
          existing,
          accountUuid:
            existing?.accountUuid ?? `led-${Date.now().toString(36)}`,
        })
      );
      notify(
        existing ? "Ledger updated successfully" : "Ledger created successfully"
      );
      onBack();
    },
    (errors) => {
      if (formType !== "form-8") return;
      const tabs = flattenErrors(errors)
        .map(([path]) => tabOfField(path))
        .filter((t): t is PartyTab => !!t);
      if (tabs.length && !tabs.includes(partyTab)) setPartyTab(tabs[0]);
    }
  );

  if (ledgerId && !existing)
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className={cn(T.title, "text-2xl")}>Ledger not found</h1>
        <p className={T.value}>
          It may have been deleted. Go back to the Chart of Accounts to find
          another.
        </p>
        <Button variant="secondary" onClick={onBack}>
          Back to Chart of Accounts
        </Button>
      </div>
    );

  const basic = (showCostCentre: boolean, afterUnder?: React.ReactNode) => (
    <BasicDetailsSection
      f={f}
      underOptions={underOptions}
      onUnderChange={() => undefined}
      showCostCentre={showCostCentre}
      afterUnder={afterUnder}
    />
  );

  const tabsWithErrors = new Set(
    errorList
      .map(([path]) => tabOfField(path))
      .filter((t): t is PartyTab => !!t)
  );

  /** The eight forms, composed as their production files compose them. */
  const body = (() => {
    switch (formType) {
      case "form-1":
        return (
          <>
            {basic(COST_CENTRE_ENABLED)}
            <AddressSection f={f} />
            <TaxRegistrationSection f={f} includePanItNo={false} />
            <BankAccountSection f={f} />
            <OpeningBalanceSection f={f} />
          </>
        );
      case "form-2":
        return (
          <>
            {basic(COST_CENTRE_ENABLED)}
            <AddressSection f={f} />
            <TaxRegistrationSection
              f={f}
              includeGstTreatment={taxRegistration}
              includeGstin={taxRegistration}
            />
            <OpeningBalanceSection f={f} />
            <FieldCard title="Additional settings">
              <SwitchRow
                label="Bill wise tracking"
                checked={isYes(values.maintainBalancesBillByBill)}
                onChange={(c) => f.set("maintainBalancesBillByBill", yesNo(c))}
                error={f.error("maintainBalancesBillByBill")}
              />
            </FieldCard>
          </>
        );
      case "form-3":
        return (
          <>
            {basic(COST_CENTRE_ENABLED)}
            <AddressSection
              f={f}
              includeMobileNo={false}
              includeEmailId={false}
            />
            <OpeningBalanceSection f={f} />
          </>
        );
      case "form-4":
        return (
          <>
            {basic(COST_CENTRE_ENABLED)}
            <AddressSection f={f} disabled={duty} />
            {!duty ? (
              <StatutorySection
                f={f}
                hsnLabel="HSN Code"
                typeOfSupplyOptions={FORM4_TYPE_OF_SUPPLY_OPTIONS}
              />
            ) : null}
            <TaxRegistrationSection
              f={f}
              disabled={duty}
              includeGstTreatment={taxRegistration}
              includeGstin={taxRegistration}
              disableGstTreatment={gstApplicable}
              disableGstin={gstApplicable}
              gstTreatmentLabel="GST Treatment (Registration Type)"
            />
            <OpeningBalanceSection f={f} />
            <FieldCard title="Additional Fields">
              <SwitchRow
                label="Bill wise tracking"
                checked={isYes(values.maintainBalancesBillByBill)}
                onChange={(c) => f.set("maintainBalancesBillByBill", yesNo(c))}
                error={f.error("maintainBalancesBillByBill")}
              />
              {dutyAllowed ? (
                <SwitchRow
                  label="Behave as Duties & Taxes Ledger"
                  checked={duty}
                  disabled={gstApplicable}
                  onChange={(c) => f.set("behaveAsDutiesTaxesLedger", yesNo(c))}
                  error={f.error("behaveAsDutiesTaxesLedger")}
                />
              ) : null}
            </FieldCard>
            {dutyAllowed && duty ? (
              <DutyTaxesSection
                f={f}
                typeOfDutyTaxOptions={TYPE_OF_DUTY_TAX_OPTIONS}
              />
            ) : null}
          </>
        );
      case "form-5": {
        const billByBill = isYes(values.maintainBalancesBillByBill);
        const inventory = isYes(values.inventoryValuesAffected);
        return (
          <>
            {basic(
              COST_CENTRE_ENABLED,
              <ComboField
                f={f}
                name="typeOfLedger"
                label="Type of Ledger"
                title="Select Type of Ledger"
                options={FORM5_TYPE_OF_LEDGER_OPTIONS}
              />
            )}
            <AddressSection f={f} disabled={duty} />
            {!duty ? (
              <StatutorySection
                f={f}
                typeOfSupplyRequired
                typeOfSupplyOptions={FORM5_TYPE_OF_SUPPLY_OPTIONS}
              />
            ) : null}
            <TaxRegistrationSection
              f={f}
              disabled={duty}
              includeGstTreatment={false}
              includeGstin={false}
            />
            <OpeningBalanceSection f={f} />
            <FieldCard title="Additional Fields">
              <SwitchRow
                label="Maintain Balances Bill by Bill"
                checked={billByBill}
                disabled={inventory && !billByBill}
                onChange={(c) => {
                  f.set("maintainBalancesBillByBill", yesNo(c));
                  if (c) f.set("inventoryValuesAffected", YES_NO.NO);
                }}
                error={f.error("maintainBalancesBillByBill")}
              />
              {inventoryAllowed ? (
                <SwitchRow
                  label="Inventory Values are Affected"
                  checked={inventory}
                  disabled={billByBill && !inventory}
                  onChange={(c) => {
                    f.set("inventoryValuesAffected", yesNo(c));
                    if (c) f.set("maintainBalancesBillByBill", YES_NO.NO);
                  }}
                  error={f.error("inventoryValuesAffected")}
                />
              ) : null}
              {dutyAllowed ? (
                <SwitchRow
                  label="Behave as Duties & Taxes Ledger"
                  checked={duty}
                  disabled={gstApplicable}
                  onChange={(c) => f.set("behaveAsDutiesTaxesLedger", yesNo(c))}
                  error={f.error("behaveAsDutiesTaxesLedger")}
                />
              ) : null}
            </FieldCard>
            {dutyAllowed && duty ? (
              <DutyTaxesSection
                f={f}
                typeOfDutyTaxOptions={TYPE_OF_DUTY_TAX_OPTIONS_WITH_OTHERS}
                showOthersPercentage
              />
            ) : null}
          </>
        );
      }
      case "form-6": {
        const dutiesGroup = underSlug === "duties-taxes";
        return (
          <>
            {basic(COST_CENTRE_ENABLED)}
            <Form6DutySection
              f={f}
              typeOfDutyTaxOptions={TYPE_OF_DUTY_TAX_OPTIONS}
            />
            <AddressSection
              f={f}
              disabled={dutiesGroup}
              includeMobileNo={false}
              includeEmailId={false}
            />
            <TaxRegistrationSection
              f={f}
              disabled={dutiesGroup}
              includeGstTreatment={false}
              includeGstin={false}
            />
            <OpeningBalanceSection f={f} />
            <FieldCard>
              <SwitchRow
                label="Bill wise tracking"
                checked={isYes(values.maintainBalancesBillByBill)}
                onChange={(c) => f.set("maintainBalancesBillByBill", yesNo(c))}
                error={f.error("maintainBalancesBillByBill")}
              />
            </FieldCard>
          </>
        );
      }
      case "form-7":
        return (
          <>
            {basic(false)}
            <AddressSection
              f={f}
              title="Address"
              includeMobileNo={false}
              includeEmailId={false}
            />
            <TaxRegistrationSection
              f={f}
              includeGstTreatment={false}
              includeGstin={false}
            />
            <OpeningBalanceSection f={f} />
          </>
        );
      case "form-8":
        return (
          <>
            {submitted && errorList.length ? (
              <Notice tone="danger" role="alert">
                <p className="font-semibold">
                  Fix {errorList.length === 1 ? "this" : "these"} before saving:
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {[...new Set(errorList.map(([, message]) => message))].map(
                    (message) => (
                      <li key={message}>{message}</li>
                    )
                  )}
                </ul>
              </Notice>
            ) : null}
            {basic(COST_CENTRE_ENABLED)}
            <PartyDetailsSection f={f} />
            <PartyDetailsTabs
              f={f}
              isSundryDebtor={underSlug === "sundry-debtors"}
              tab={partyTab}
              onTabChange={setPartyTab}
              tabsWithErrors={tabsWithErrors}
            />
            <DocumentsSection onUnbuilt={onUnbuilt} />
          </>
        );
    }
  })();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-gray bg-background px-6 pb-3 pt-5">
        <PageButton
          label="Back to Chart of Accounts"
          disabled={false}
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </PageButton>
        <h1 className={cn(T.title, "mr-auto text-2xl")}>
          {existing ? "Edit Ledger" : "New Ledger"}
        </h1>
        <Button variant="outline" onClick={onBack}>
          Discard
        </Button>
        <Button type="submit" form="ledger-form">
          Save Ledger
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <form
          id="ledger-form"
          noValidate
          onSubmit={save}
          data-form-type={formType}
          className="flex w-full max-w-5xl flex-col gap-4 px-6 py-6"
        >
          {body}
        </form>
      </div>
    </div>
  );
};

export default LedgerForm;
