"use server";

import { headers } from "next/headers";
import { clientIp, hashIp } from "@/lib/client-ip";
import { contactSchema } from "@/lib/contact-schema";
import type { ContactErrors, ContactValues } from "@/lib/contact-fields";
import { getContactSettings } from "@/lib/contact";
import { createContactMessage } from "@/lib/message-store";
import { sendMail } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";

/**
 * The contact form's submit path.
 *
 * A server action rather than a route handler: the form posts to a function
 * that only exists on the server, so there is no public endpoint to find and
 * no JSON contract to keep in step between two files. The order below is the
 * whole design — trap, limit, validate, **store**, then notify — and the last
 * two are in that order on purpose. Mail is the part most likely to fail, and
 * a message that was written down but not announced is recoverable from the
 * inbox; one that was announced but not written down is gone.
 */

/** Five per hour, per address. */
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

export type ContactResult =
  | { ok: true }
  | { ok: false; errors?: ContactErrors; message?: string };

export async function submitContactMessage(
  values: ContactValues,
): Promise<ContactResult> {
  // The honeypot, checked before anything expensive. A bot that filled it gets
  // the success state and no database write: telling it that it was detected
  // just teaches whoever wrote it which field to skip next time.
  if (values.website?.trim()) return { ok: true };

  const headerList = await headers();
  const ip = clientIp(headerList);
  const ipHash = hashIp(ip);

  const limited = await rateLimit(`contact:${ipHash || ip}`, LIMIT, WINDOW_MS);
  if (!limited.allowed) {
    return {
      ok: false,
      message:
        "That's a few messages in a short time. Give it an hour, or call us instead.",
    };
  }

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const errors: ContactErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof ContactValues | undefined;
      // First message per field wins — a field with two problems still only
      // has room for one line under it.
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { ok: false, errors };
  }

  const data = parsed.data;

  let stored;
  try {
    stored = await createContactMessage({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      need: data.need,
      message: data.message,
      ipHash,
    });
  } catch (error) {
    console.error("[contact] could not store submission:", error);
    return {
      ok: false,
      message: "We couldn't save that just now. Please try again in a moment.",
    };
  }

  // Best effort, and deliberately not awaited into the result. The visitor's
  // confirmation is about their message being received, which it has been.
  const settings = await getContactSettings().catch(() => null);
  const result = await sendMail({
    to: settings?.email || "hello@bluex.agency",
    subject: `New enquiry — ${data.name}${data.company ? ` (${data.company})` : ""}`,
    // `replyTo`, not `from`: Hostinger will not send as an address it does not
    // authenticate, and SPF would fail if it did. This way hitting reply in a
    // mail client answers the person who wrote in.
    replyTo: data.email,
    text: notificationText(data, stored.threadId),
  });

  if (result.sent === false && result.reason === "failed") {
    // The submission is safe in the inbox; only the heads-up was lost. Worth a
    // loud log, not worth telling the visitor their message failed.
    console.error("[contact] stored but notification failed:", stored.id);
  }

  return { ok: true };
}

function notificationText(
  data: {
    name: string;
    email: string;
    phone: string;
    company: string;
    need: string;
    message: string;
  },
  threadId: string,
): string {
  return [
    `New message from the BlueX contact form.`,
    ``,
    `Name:     ${data.name}`,
    `Email:    ${data.email}`,
    `Phone:    ${data.phone || "—"}`,
    `Company:  ${data.company || "—"}`,
    `Needs:    ${data.need}`,
    ``,
    data.message,
    ``,
    `—`,
    `Thread ${threadId} — reply from the admin inbox at /admin.`,
  ].join("\n");
}
