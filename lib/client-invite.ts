import "server-only";
import { sendMail, type SendResult } from "./mailer.ts";
import { SITE_NAME, SITE_URL } from "./site.ts";

/**
 * The invitation and its email.
 *
 * Kept apart from `client-auth.ts` on purpose: that module decides who may sign
 * in, and it should stay testable without a mail server attached. This one only
 * knows how to phrase a link.
 *
 * The link carries the only copy of the token that exists outside the
 * recipient's mailbox — the database holds a digest — so it is built once, here,
 * and never logged. `sendMail` reports failure rather than throwing, which
 * matters because the client record has already been written by the time this
 * runs: an unreachable SMTP server should cost an email, not a client.
 */

export function setupUrl(token: string): string {
  return `${SITE_URL}/clients/setup?token=${encodeURIComponent(token)}`;
}

function hoursFrom(ttlMs: number): number {
  return Math.round(ttlMs / (60 * 60 * 1000));
}

/**
 * Plain text as well as HTML, and the plain part is not an afterthought.
 *
 * A one-time link that arrives as an empty message because the reader's client
 * refuses HTML is a support ticket, and the recipient cannot work around it —
 * there is nothing to retype. Both parts carry the full URL for the same reason.
 */
function invitationText(options: {
  name: string;
  url: string;
  ttlHours: number;
}): string {
  return [
    `Hi ${options.name},`,
    "",
    `An account has been created for you on the ${SITE_NAME} client portal.`,
    "",
    "Use the link below to choose a password and finish setting it up:",
    "",
    options.url,
    "",
    `The link works once and expires in ${options.ttlHours} hours. If it has`,
    "already lapsed, ask us to send a new one — we cannot recover the old link,",
    "only replace it.",
    "",
    "If you were not expecting this, you can ignore this email. Nobody can sign",
    "in as you until a password is set through that link.",
    "",
    `— ${SITE_NAME}`,
  ].join("\n");
}

function invitationHtml(options: {
  name: string;
  url: string;
  ttlHours: number;
}): string {
  // Inline styles and a table-free layout: this has to survive Outlook and
  // Gmail, neither of which can be relied on for a stylesheet. Deliberately
  // plain — an invitation that looks like a marketing campaign is an invitation
  // that gets filtered.
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a0b0f;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(options.name)},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
      An account has been created for you on the ${SITE_NAME} client portal.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
      Use the button below to choose a password and finish setting it up.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(options.url)}"
         style="display:inline-block;background:#2e6bff;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:600;">
        Set your password
      </a>
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#5a6070;">
      The link works once and expires in ${options.ttlHours} hours. If it has
      already lapsed, ask us to send a new one — we cannot recover the old link,
      only replace it.
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#5a6070;">
      If the button does not work, copy this into your browser:<br>
      <span style="word-break:break-all;color:#2e6bff;">${escapeHtml(options.url)}</span>
    </p>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#8a909c;">
      If you were not expecting this, you can ignore this email. Nobody can sign
      in as you until a password is set through that link.
    </p>
  </div>
</body>
</html>`;
}

/**
 * Escapes for HTML text and quoted attributes.
 *
 * The name is administrator-entered and the URL is built here, so neither is
 * hostile today. It is escaped anyway: the cost is nothing, and "the input is
 * trusted" is a property of today's call sites rather than of this function.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendClientInvitation(options: {
  to: string;
  name: string;
  token: string;
  ttlMs: number;
}): Promise<SendResult> {
  const url = setupUrl(options.token);
  const ttlHours = hoursFrom(options.ttlMs);

  return sendMail({
    to: options.to,
    subject: `Set up your ${SITE_NAME} client portal account`,
    text: invitationText({ name: options.name, url, ttlHours }),
    html: invitationHtml({ name: options.name, url, ttlHours }),
  });
}
