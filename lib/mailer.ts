import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { smtpConfig } from "./mail-config.ts";

/**
 * Outgoing mail.
 *
 * One transporter for the process, cached on `globalThis` for the same reason
 * the Mongo client is: Next replaces modules on every edit in dev, and a
 * transporter created at module scope would leak a connection pool per reload.
 *
 * `server-only` at the top is not decoration — it makes importing this from a
 * client component a build error rather than a bundle containing the SMTP
 * password.
 */

declare global {
  var __bxMailer: Transporter | undefined;
}

export type SendResult =
  | { sent: true; messageId: string }
  /** Credentials absent. Not an error: see `smtpConfig`. */
  | { sent: false; reason: "unconfigured" }
  | { sent: false; reason: "failed"; error: string };

function transporter(): Transporter | null {
  const config = smtpConfig();
  if (!config) return null;

  if (!globalThis.__bxMailer) {
    globalThis.__bxMailer = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      // A hung SMTP handshake must not hold a request open. Hostinger is
      // usually sub-second; ten is generous and still bounded.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  return globalThis.__bxMailer;
}

export function isMailConfigured(): boolean {
  return smtpConfig() !== null;
}

/**
 * Sends, and never throws.
 *
 * Every caller is doing something else that already succeeded — a message is
 * in the database, a reply is recorded — and losing that work because a mail
 * server was briefly unreachable would be the wrong trade. The result says
 * plainly which of the three things happened so the caller can report it.
 */
export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** RFC 5322 threading headers, so a reply lands in the right conversation. */
  inReplyTo?: string;
  references?: string[];
}): Promise<SendResult> {
  const config = smtpConfig();
  const transport = transporter();
  if (!config || !transport) return { sent: false, reason: "unconfigured" };

  try {
    const info = await transport.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      inReplyTo: options.inReplyTo,
      // The header is a space-separated list; nodemailer joins an array for us,
      // but building the string here keeps the shape obvious at the call site.
      references: options.references?.length
        ? options.references.join(" ")
        : undefined,
    });

    return { sent: true, messageId: info.messageId ?? "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mail] send failed:", message);
    return { sent: false, reason: "failed", error: message };
  }
}
