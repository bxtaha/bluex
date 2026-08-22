/**
 * The shape of the contact form, with no dependencies.
 *
 * Split out from `contact-schema.ts` on purpose. That file imports zod and is
 * server-only — validation the browser can edit is not validation — but the
 * client still needs the field list and the select's options, and importing the
 * schema to get them would drag zod into the marketing page's bundle. This page
 * bought its LCP back by deleting unused JavaScript; it is not spending it
 * again on a validator the server has to re-run anyway.
 */

/** The closed set the select offers. Stored verbatim on the message. */
export const NEED_OPTIONS = [
  "Outbound lead callback",
  "Inbound call answering",
  "Website or E-commerce",
  "More than one of these",
  "Something else",
] as const;

export type Need = (typeof NEED_OPTIONS)[number];

export type ContactValues = {
  name: string;
  email: string;
  phone: string;
  company: string;
  need: string;
  message: string;
  /**
   * The bot trap. Named like a field a scraper would want to fill and hidden
   * from people; a human never sees it, so anything in it is automation.
   */
  website: string;
};

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

export const EMPTY_CONTACT: ContactValues = {
  name: "",
  email: "",
  phone: "",
  company: "",
  need: NEED_OPTIONS[0],
  message: "",
  website: "",
};

/** Matches the server's `min(10)`, so the hint and the rule cannot disagree. */
export const MESSAGE_MIN_LENGTH = 10;

/**
 * Digits only, for a `wa.me` link.
 *
 * `wa.me` takes an international number with no `+`, no spaces and no dashes;
 * anything else lands on a 404 rather than failing visibly. Deriving the link
 * from the displayed number means there is one field to edit, not two that can
 * disagree.
 *
 * These live here, with the other dependency-free contact bits, rather than
 * beside the settings store — that file imports the Mongo driver, and a client
 * component calling into it would pull the whole driver into the browser
 * bundle.
 */
export function whatsappDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function whatsappHref(value: string): string | null {
  const digits = whatsappDigits(value);
  // Shorter than this is not an international number, and a link that goes
  // nowhere is worse than no link.
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

/**
 * A `tel:` link from the displayed number.
 *
 * Spaces and dashes are stripped because diallers are inconsistent about them,
 * but a leading `+` is kept: without it a phone treats the number as local to
 * wherever the caller happens to be standing, and this site is read from the
 * Gulf, Canada and Australia. Same single-source-of-truth reasoning as
 * `whatsappHref` — the link is derived from the one field an admin edits, so
 * the two can never drift apart.
 */
export function telHref(value: string | null | undefined): string | null {
  // Total on purpose. Its whole contract is "null when this cannot be dialled",
  // and a missing value is the clearest possible case of that — throwing there
  // would take a page down over an absent optional field.
  const trimmed = value?.trim() ?? "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}
