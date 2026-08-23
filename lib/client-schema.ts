import { z } from "zod";

/**
 * Server-side validation for client records.
 *
 * The same reasoning as `contact-schema.ts`: the browser's `required` and
 * `type="email"` are a courtesy to whoever is filling the form in, and markup is
 * editable. This is the only validation that counts, and it runs on requests
 * that arrive by any means — including curl against the route directly.
 *
 * Upper bounds on every string matter as much as the lower ones. Without them a
 * single request writes a megabyte into the collection, and "required" says
 * nothing at all about "reasonable".
 *
 * Note what is *absent*: `status`, `passwordHash`, `setupTokenHash`. Those are
 * not fields an administrator submits, so they have no place in a schema that
 * parses a request body. Status changes go through their own endpoint with their
 * own side effects, which is what stops a client being activated by adding a key
 * to an edit form's JSON.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .max(160, "That email is too long.")
  .email("That email doesn't look right.");

const name = z
  .string()
  .trim()
  .min(2, "Enter the client's name.")
  .max(120, "That name is too long.");

const company = z.string().trim().max(160, "That company name is too long.");

// Optional and international, matching the contact form: this audience spans the
// Gulf, Canada and Australia, and a regex written for one of them rejects the
// others.
const phone = z
  .string()
  .trim()
  .max(40, "That number is too long.")
  .refine(
    (value) => value === "" || (value.match(/\d/g)?.length ?? 0) >= 7,
    "Include the country code, or leave it blank.",
  );

export const createClientSchema = z.object({
  email,
  name,
  company: company.optional().default(""),
  phone: phone.optional().default(""),
});

/**
 * Every field optional, because a PATCH that only changes a phone number should
 * not have to resend a name. `email` is deliberately not here: it is the
 * identity these records are keyed by, and changing it silently would orphan an
 * outstanding invitation and any session tied to the address. Replacing a client
 * is the honest way to change one.
 */
export const updateClientSchema = z
  .object({
    name: name.optional(),
    company: company.optional(),
    phone: phone.optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Nothing to update.",
  );

export const clientStatusSchema = z.object({
  status: z.enum(["active", "suspended"], {
    message: "Status must be active or suspended.",
  }),
});

export type CreateClientPayload = z.infer<typeof createClientSchema>;
export type UpdateClientPayload = z.infer<typeof updateClientSchema>;

/**
 * Flattens a Zod error into one message per field.
 *
 * The admin UI shows errors beside the input they belong to, so it needs the
 * field name; a single joined string would force it to guess.
 */
export function fieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }

  return out;
}
