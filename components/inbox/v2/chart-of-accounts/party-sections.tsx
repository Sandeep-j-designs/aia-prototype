import React from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  COA_BANK_OPTIONS,
  COUNTRIES,
  GST_TREATMENT_OPTIONS,
  INDIAN_STATES,
} from "@/config/pages/inbox/chart-of-accounts";
import {
  getGstRules,
  korefiTreatmentOf,
} from "@/schemas/inbox/chart-of-accounts";
import { stateFromGstin } from "@/utils/pages/inbox/chart-of-accounts";
import { FieldCard, T } from "@/components/inbox/v2/ui";
import {
  ComboField,
  OpeningBalanceFields,
  SwitchRow,
  TextField,
  digits,
  upperAlnum,
  type FormApi,
} from "./form-fields";
import { isYes, yesNo } from "./form-sections";

/**
 * form-8, the party ledger (Sundry Debtors and Sundry Creditors).
 *
 * Production: forms/form-8/party-details-section.tsx and details-tabs.tsx,
 * whose tabs reuse the vendor master's GST, address, bank and contact forms
 * (components/merchants/merchant-form/*). The Link-GSTIN-to-address modal and
 * the Documents upload are not built here.
 */

export type PartyTab =
  "gst-details" | "address-details" | "bank-details" | "contact-person";

export const PARTY_TABS: { key: PartyTab; label: string }[] = [
  { key: "gst-details", label: "GST Details" },
  { key: "address-details", label: "Address Details" },
  { key: "bank-details", label: "Bank Details" },
  { key: "contact-person", label: "Contact Person" },
];

/** Which tab holds a failing field, so Save can open it. */
export const tabOfField = (path: string): PartyTab | null =>
  path.startsWith("gstDetails")
    ? "gst-details"
    : path.startsWith("customerMerchantAddresses")
      ? "address-details"
      : path.startsWith("bankDetails")
        ? "bank-details"
        : path.startsWith("contactInformations")
          ? "contact-person"
          : null;

/* ---------------------------------------------------------- Party Details */
export const PartyDetailsSection = ({ f }: { f: FormApi }) => (
  <FieldCard title="Party Details">
    <TextField
      f={f}
      name="legalName"
      label="Legal Name"
      placeholder="Enter Legal Name"
    />
    <TextField
      f={f}
      name="mobileNo"
      label="Phone Number"
      type="tel"
      inputMode="numeric"
      maxLength={10}
      prefix="+91"
      filter={digits(10)}
    />
    <TextField
      f={f}
      name="emailId"
      label="Email ID"
      type="email"
      placeholder="Enter Email ID"
    />
    <ComboField
      f={f}
      name="gstTreatmentUuid"
      label="GST Treatment"
      required
      title="Select GST Treatment"
      options={GST_TREATMENT_OPTIONS}
      onPicked={(value) =>
        f.set(
          "gstTreatment",
          GST_TREATMENT_OPTIONS.find((o) => o.value === value)
            ?.korefiGstTreatment ?? ""
        )
      }
    />
    <OpeningBalanceFields f={f} />
    <SwitchRow
      label="Bill wise tracking"
      checked={isYes(f.values.maintainBalancesBillByBill)}
      onChange={(checked) =>
        f.set("maintainBalancesBillByBill", yesNo(checked))
      }
      error={f.error("maintainBalancesBillByBill")}
    />
    {isYes(f.values.maintainBalancesBillByBill) ? (
      <TextField
        f={f}
        name="paymentTerms"
        label="Credit Period"
        inputMode="numeric"
        maxLength={4}
        suffix="days"
        filter={digits(4)}
      />
    ) : null}
  </FieldCard>
);

/* ------------------------------------------------------------ GST Details */
const GstDetailsTab = ({ f }: { f: FormApi }) => {
  const rules = getGstRules(korefiTreatmentOf(f.values.gstTreatmentUuid));
  const sourceRequired =
    rules.sourceOfSupplyRequired &&
    korefiTreatmentOf(f.values.gstTreatmentUuid) !== "business_none";
  const details = f.values.gstDetails;
  return (
    <div className="flex flex-col gap-6">
      {details.map((_, index) => (
        <div key={index} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className={cn(T.label, "text-sm text-foreground")}>
              GST - {index + 1}
            </h3>
            {index > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove GST - ${index + 1}`}
                className="text-secondary-foreground"
                onClick={() =>
                  f.set(
                    "gstDetails",
                    details.filter((__, i) => i !== index)
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-x-[30px] gap-y-6 sm:grid-cols-2">
            {rules.showGSTIN ? (
              <TextField
                f={f}
                name={`gstDetails.${index}.gstin`}
                label="GSTIN"
                required={rules.gstinRequired}
                placeholder="GST Number"
                maxLength={15}
                filter={(raw) => {
                  const next = upperAlnum(15)(raw);
                  // production's autoFillGstDetails: state and PAN from GSTIN.
                  const state = stateFromGstin(next);
                  if (state) f.set(`gstDetails.${index}.placeOfSupply`, state);
                  if (next.length >= 12)
                    f.set(`gstDetails.${index}.panNo`, next.slice(2, 12));
                  return next;
                }}
              />
            ) : null}
            <TextField
              f={f}
              name={`gstDetails.${index}.panNo`}
              label="PAN Number"
              placeholder="PAN Number"
              maxLength={10}
              filter={upperAlnum(10)}
            />
            {rules.showSourceOfSupply ? (
              <ComboField
                f={f}
                name={`gstDetails.${index}.placeOfSupply`}
                label="Source of Supply"
                required={sourceRequired}
                title="Source of Supply"
                options={INDIAN_STATES}
              />
            ) : null}
          </div>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            f.set("gstDetails", [
              ...details,
              { gstin: "", panNo: "", placeOfSupply: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add GSTIN
        </Button>
      </div>
    </div>
  );
};

/* --------------------------------------------------------- Address Details */
const AddressBlock = ({
  f,
  kind,
}: {
  f: FormApi;
  kind: "billing" | "shipping";
}) => {
  const base = `customerMerchantAddresses.${kind}.0`;
  return (
    <div className="flex flex-col gap-4">
      <h3 className={cn(T.label, "text-sm text-foreground")}>
        {kind === "billing" ? "Billing Address" : "Shipping Address"}
      </h3>
      <p className={cn(T.label, "-mt-2")}>Address-1</p>
      <div className="grid grid-cols-1 gap-x-[30px] gap-y-6 sm:grid-cols-2">
        <TextField
          f={f}
          name={`${base}.addrLine_1`}
          label="Address Line 1"
          placeholder="Address Line 1"
          wide
        />
        <TextField
          f={f}
          name={`${base}.addrLine_2`}
          label="Address Line 2"
          placeholder="Address Line 2"
          wide
        />
        <TextField
          f={f}
          name={`${base}.addrLine_3`}
          label="Address Line 3"
          placeholder="Address Line 3"
          wide
        />
        <ComboField
          f={f}
          name={`${base}.country`}
          label="Country"
          title="Country"
          options={COUNTRIES}
        />
        <ComboField
          f={f}
          name={`${base}.state`}
          label="State"
          title="State"
          options={INDIAN_STATES}
        />
        <TextField
          f={f}
          name={`${base}.city`}
          label="City"
          placeholder="City"
        />
        <TextField
          f={f}
          name={`${base}.pincode`}
          label="Pincode"
          placeholder="Pincode"
          inputMode="numeric"
          maxLength={6}
          filter={digits(6)}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------- Bank and Contact Person */
const BankTab = ({ f }: { f: FormApi }) => (
  <div className="grid grid-cols-1 gap-x-[30px] gap-y-6 sm:grid-cols-2">
    <TextField
      f={f}
      name="bankDetails.0.accountName"
      label="Account Holder Name"
      placeholder="Account Holder Name"
    />
    <ComboField
      f={f}
      name="bankDetails.0.bankName"
      label="Bank Name"
      title="Bank Name"
      options={COA_BANK_OPTIONS}
      hasSearch
    />
    <TextField
      f={f}
      name="bankDetails.0.accountNumber"
      label="Account Number"
      placeholder="Account Number"
      inputMode="numeric"
      maxLength={18}
      filter={digits(18)}
    />
    <TextField
      f={f}
      name="bankDetails.0.ifscCode"
      label="IFSC Code"
      placeholder="IFSC Code"
      maxLength={11}
      filter={upperAlnum(11)}
    />
    <TextField
      f={f}
      name="bankDetails.0.upiId"
      label="UPI ID"
      placeholder="Enter UPI ID"
      wide
    />
  </div>
);

const ContactTab = ({ f }: { f: FormApi }) => (
  <div className="grid grid-cols-1 gap-x-[30px] gap-y-6 sm:grid-cols-2">
    <TextField
      f={f}
      name="contactInformations.0.firstName"
      label="First Name"
      placeholder="First Name"
    />
    <TextField
      f={f}
      name="contactInformations.0.lastName"
      label="Last Name"
      placeholder="Last Name"
    />
    <TextField
      f={f}
      name="contactInformations.0.email"
      label="Email"
      type="email"
      placeholder="Email"
    />
    <TextField
      f={f}
      name="contactInformations.0.phoneNo"
      label="Phone Number"
      type="tel"
      inputMode="numeric"
      maxLength={10}
      placeholder="Phone Number"
      filter={digits(10)}
    />
  </div>
);

/* --------------------------------------------------------------- the tabs */
export const PartyDetailsTabs = ({
  f,
  isSundryDebtor,
  tab,
  onTabChange,
  tabsWithErrors,
}: {
  f: FormApi;
  isSundryDebtor: boolean;
  tab: PartyTab;
  onTabChange: (tab: PartyTab) => void;
  tabsWithErrors: Set<PartyTab>;
}) => (
  <section className="rounded-md bg-section px-5 pb-5">
    <Tabs value={tab} onValueChange={(next) => onTabChange(next as PartyTab)}>
      <TabsList className="mb-5 h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b border-neutral-gray bg-transparent p-0">
        {PARTY_TABS.map((entry) => (
          <TabsTrigger
            key={entry.key}
            value={entry.key}
            className="gap-1.5 rounded-none border-b-2 border-transparent px-2.5 py-3 text-sm text-secondary-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            {entry.label}
            {tabsWithErrors.has(entry.key) ? (
              // A field on this tab failed Save; the dot says where to look.
              <span
                aria-label="Has errors"
                className="h-1.5 w-1.5 rounded-full bg-destructive-foreground"
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
    {tab === "gst-details" ? <GstDetailsTab f={f} /> : null}
    {tab === "address-details" ? (
      <div className="flex flex-col gap-8">
        <AddressBlock f={f} kind="billing" />
        {isSundryDebtor ? <AddressBlock f={f} kind="shipping" /> : null}
      </div>
    ) : null}
    {tab === "bank-details" ? <BankTab f={f} /> : null}
    {tab === "contact-person" ? <ContactTab f={f} /> : null}
  </section>
);

/** production's DocumentsForm. Uploading is not part of this prototype. */
export const DocumentsSection = ({
  onUnbuilt,
}: {
  onUnbuilt: (what: string) => void;
}) => (
  <section className="flex items-center justify-between gap-4 rounded-md bg-section p-5">
    <div>
      <h2 className={T.section}>Documents</h2>
      <p className={cn(T.sub, "mt-1")}>
        Agreements, GST certificates or cancelled cheques for this party.
      </p>
    </div>
    <Button
      type="button"
      variant="outline"
      onClick={() => onUnbuilt("Attaching documents to a ledger")}
    >
      <Paperclip className="h-4 w-4" />
      Upload Documents
    </Button>
  </section>
);
