/**
 * One place that reads the mail environment.
 *
 * SMTP and IMAP are separate services with separate credentials, but on
 * Hostinger they are the same mailbox reached two ways, so the defaults point
 * at the same host family and the passwords are allowed to differ only if
 * someone sets them differently.
 *
 * Nothing here is prefixed `NEXT_PUBLIC_`, so none of it can reach the browser.
 * Every consumer of this module is a server action, a route handler or a
 * scheduled job; if one of them is ever imported from a client component the
 * build will fail on `node:` imports downstream, which is the failure we want.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  /** Envelope sender. Hostinger rejects a From that is not the authenticated box. */
  from: string;
  /** Where new-submission notifications land. */
  notifyTo: string;
};

export type ImapConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  mailbox: string;
};

/**
 * The address the site presents when nothing overrides it.
 *
 * Re-exported from `lib/site.ts` rather than spelled out, because spelling it
 * out is how it drifted. This constant is the fallback behind the
 * admin-editable contact section and it read `hello@bluex.agency`, while
 * `CONTACT_EMAIL` — used by the structured data and the footer — read
 * `hey@bluex.agency`. The stored value in the database is `hey@`, so the
 * difference only showed if the database was empty or unreachable, at which
 * point the contact section would advertise a mailbox no other part of the
 * site mentions. One source now; if the real address is ever neither of
 * those, `CONTACT_EMAIL` is the single line to change.
 */
export { CONTACT_EMAIL as DEFAULT_CONTACT_EMAIL } from "./site.ts";

function port(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Returns null when the credentials are absent.
 *
 * Deliberately not a throw. The site has to build and run on a machine with no
 * mailbox — CI, a fresh clone, a preview box — and the honest behaviour there
 * is "the message was stored, the notification was not sent", not a 500 on the
 * contact form. Callers branch on null and say so.
 */
export function smtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return {
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: port(process.env.SMTP_PORT, 465),
    // 465 is implicit TLS. Anything else is STARTTLS, which nodemailer
    // negotiates itself when `secure` is false.
    secure: (process.env.SMTP_SECURE ?? "true") !== "false",
    user,
    pass,
    from: process.env.MAIL_FROM || user,
    notifyTo: process.env.MAIL_TO || process.env.MAIL_FROM || user,
  };
}

export function imapConfig(): ImapConfig | null {
  const user = process.env.IMAP_USER || process.env.SMTP_USER;
  const pass = process.env.IMAP_PASS || process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return {
    host: process.env.IMAP_HOST || "imap.hostinger.com",
    port: port(process.env.IMAP_PORT, 993),
    secure: (process.env.IMAP_SECURE ?? "true") !== "false",
    user,
    pass,
    mailbox: process.env.IMAP_MAILBOX || "INBOX",
  };
}
