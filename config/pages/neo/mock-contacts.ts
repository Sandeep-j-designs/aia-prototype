/**
 * The vendor master's contact fields, for the vendors the demo chases.
 * Names are real companies; the addresses and numbers are made up and use
 * the reserved example pattern so nothing reaches a real inbox or phone.
 *
 * Vendors not listed have no contact on file — the chase then offers to add
 * one in the chat.
 *
 * DEV: part of GET /api/vendors (contact.email, contact.whatsapp).
 */
export type VendorContact = { email?: string; whatsapp?: string };

export const MOCK_VENDOR_CONTACTS: Record<string, VendorContact> = {
  "Mahindra Logistics Ltd": {
    email: "ap.south@mahindralogistics.example.com",
    whatsapp: "+91 98450 31207",
  },
  "Blue Dart Express Ltd": {
    email: "billing.blr@bluedart.example.com",
  },
  "Vardhman Packaging Pvt Ltd": {
    whatsapp: "+91 99001 48823",
  },
};

/**
 * The approved WhatsApp template a vendor request goes out on. Outside the
 * 24-hour reply window WhatsApp only delivers approved templates, so the
 * wording around the request is fixed.
 */
export const VENDOR_REQUEST_TEMPLATE = "vendor_document_request_v2";
