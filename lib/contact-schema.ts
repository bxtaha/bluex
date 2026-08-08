import { z } from "zod";
import { MESSAGE_MIN_LENGTH, NEED_OPTIONS } from "./contact-fields.ts";

/**
 * The only validation that counts.
 *
 * The browser's `required` and `type="email"` are a courtesy to the person
 * filling the form in; they are markup, and markup is editable. Everything that
 * reaches the database passes through here first, on the server, where nothing
 * the client sends can change the rules.
 *
 * Upper bounds on every string are as much a part of that as the lower ones:
 * without them a single request can write a megabyte into the collection, and
 * "required" says nothing about "reasonable".
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "That name is too long."),

  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .max(160, "That email is too long.")
    .email("That email doesn't look right."),

  // Optional, and international. No format check beyond a plausible digit
  // count — this audience spans the Gulf, Canada and Australia, and a regex
  // written for one of them rejects the others.
  phone: z
    .string()
    .trim()
    .max(40, "That number is too long.")
    .refine(
      (value) => value === "" || (value.match(/\d/g)?.length ?? 0) >= 7,
      "Include the country code, or leave it blank.",
    ),

  company: z.string().trim().max(160, "That company name is too long."),

  // A closed set, so the stored value can be trusted downstream — the select
  // offers these four and the server accepts only these four.
  need: z.enum(NEED_OPTIONS, { message: "Please choose one of the options." }),

  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN_LENGTH, `Please write at least ${MESSAGE_MIN_LENGTH} characters.`)
    .max(5000, "That message is too long — please trim it a little."),

  // The honeypot. Validated rather than ignored so a filled one is a parse
  // failure the caller can distinguish, not a silent pass.
  website: z.string().max(0),
});

export type ContactPayload = z.infer<typeof contactSchema>;
