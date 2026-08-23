import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ClientAuthShell } from "@/components/ui/client-auth-shell";
import { ClientSetupForm } from "@/components/ui/client-setup-form";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-core";
import { checkSetupToken } from "@/lib/client-auth";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * Setting a password from an invitation link.
 *
 * The token is validated on the server *before* any form is rendered, so someone
 * arriving with a lapsed link is told so immediately rather than after typing a
 * password. `checkSetupToken` reads without consuming: this page can be reloaded
 * and refreshed without burning the invitation, and only the POST claims it.
 *
 * Explaining exactly which thing went wrong is safe here, and unusual enough to
 * be worth stating why. Whoever holds this token already holds the secret, so
 * "expired" versus "already used" discloses nothing they could not determine by
 * submitting — and it is the difference between asking us for a new link and
 * assuming they mistyped something.
 */
export default async function ClientSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let state: Awaited<ReturnType<typeof checkSetupToken>>;
  try {
    state = await checkSetupToken(token ?? "");
  } catch (error) {
    // Fail closed. An unreachable database is not a valid token, and rendering
    // the form anyway would take a password and then throw it away.
    console.error("[clients] could not check setup token:", error);
    state = { valid: false, reason: "unknown" };
  }

  if (!state.valid) {
    const explanations: Record<typeof state.reason, string> = {
      unknown:
        "This setup link is not valid. It may have been mistyped, or replaced by a newer one.",
      expired:
        "This setup link has expired. Setup links last 72 hours — ask us for a fresh one and it will work straight away.",
      used: "This setup link has already been used. Your password is set, so you can sign in normally.",
      suspended:
        "This account is not currently active. Get in touch and we will sort it out.",
    };

    const alreadyDone = state.reason === "used";

    return (
      <ClientAuthShell
        title={alreadyDone ? "Already set up" : "Link no longer works"}
        subtitle={
          alreadyDone
            ? "Nothing more to do here."
            : "Nothing is wrong with your account."
        }
      >
        <div className="flex flex-col items-center text-center">
          {alreadyDone ? (
            <CheckCircle2 className="size-8 text-electric" aria-hidden />
          ) : (
            <AlertCircle className="size-8 text-amber-400" aria-hidden />
          )}

          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            {explanations[state.reason]}
          </p>

          {alreadyDone ? (
            <Link
              href="/clients/login"
              className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-electric text-sm font-semibold text-white transition-colors hover:bg-electric-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"
            >
              Go to sign in
            </Link>
          ) : (
            <Link
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border border-white/12 text-sm font-semibold text-ink transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"
            >
              Request a new link
            </Link>
          )}
        </div>
      </ClientAuthShell>
    );
  }

  return (
    <ClientAuthShell
      title={`Welcome, ${state.name.split(" ")[0]}`}
      subtitle="Choose a password to finish setting up your account."
    >
      <ClientSetupForm
        token={token ?? ""}
        email={state.email}
        minLength={MIN_PASSWORD_LENGTH}
      />
    </ClientAuthShell>
  );
}
