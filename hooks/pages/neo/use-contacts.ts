import { MOCK_VENDOR_CONTACTS } from "@/config/pages/neo/mock-contacts";
import type { VendorContact } from "@/config/pages/neo/mock-contacts";

/**
 * How to reach a vendor: the email and WhatsApp number in the vendor
 * master. A contact added from a chase is saved here, so the next chase
 * goes without asking. In memory, reseeded on load.
 *
 * DEV: GET/PATCH /api/vendors/:id/contact — the vendor master's fields.
 */

let contacts: Record<string, VendorContact> | null = null;

const all = () => (contacts ||= structuredClone(MOCK_VENDOR_CONTACTS));

/** A vendor's contact, matched on the name the bill carries. */
export const contactFor = (vendor: string): VendorContact =>
  all()[vendor] || {};

export const saveContact = (vendor: string, patch: VendorContact) => {
  const book = all();
  book[vendor] = { ...book[vendor], ...patch };
};

/** "+91 98450 12342" from any way of writing an Indian mobile, or undefined. */
export const normalisePhone = (text: string) => {
  const digits = text.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits)
    ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    : undefined;
};

export const normaliseEmail = (text: string) => {
  const t = text.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(t) ? t : undefined;
};
