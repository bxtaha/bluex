/**
 * One schema for the lead payload, imported by both the form and the route
 * handler. Kept dependency-free and shared so client-side validation can never
 * drift from what the server actually enforces.
 */

/**
 * Where the lead came from. The inline demo widget trades the business name
 * for lower friction — asking for it before someone will try the thing is
 * what stops them trying it. The agent asks on the call instead.
 */
export type LeadSource = "form" | "inline";

export type LeadInput = {
  name: string;
  business: string;
  phone: string;
  email: string;
};

export type LeadErrors = Partial<Record<keyof LeadInput, string>>;

export const EMPTY_LEAD: LeadInput = {
  name: "",
  business: "",
  phone: "",
  email: "",
};

// Deliberately permissive: this is an international audience (Gulf, Canada,
// Australia) with wildly different national formats, so it checks for a
// plausible digit count rather than trying to parse a specific country's shape.
const PHONE_DIGITS = /\d/g;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLead(
  input: Partial<LeadInput>,
  source: LeadSource = "form",
): LeadErrors {
  const errors: LeadErrors = {};

  const name = input.name?.trim() ?? "";
  if (name.length < 2) errors.name = "Please enter your name.";

  const business = input.business?.trim() ?? "";
  if (source === "form" && business.length < 2) {
    errors.business = "Please enter your business name.";
  }

  const phone = input.phone?.trim() ?? "";
  const digits = phone.match(PHONE_DIGITS)?.length ?? 0;
  if (digits < 7 || digits > 15) {
    errors.phone = "Enter a phone number including country code.";
  }

  const email = input.email?.trim() ?? "";
  if (email && !EMAIL.test(email)) {
    errors.email = "That email doesn't look right.";
  }

  return errors;
}

export function isValidLead(
  input: Partial<LeadInput>,
  source: LeadSource = "form",
): boolean {
  return Object.keys(validateLead(input, source)).length === 0;
}
