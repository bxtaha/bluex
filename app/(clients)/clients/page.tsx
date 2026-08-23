import { redirect } from "next/navigation";
import Link from "next/link";
import { ClientLogoutButton } from "@/components/ui/client-logout-button";
import { currentClient } from "@/lib/client-guard";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The portal.
 *
 * The gate is resolved on the server, before any markup exists, so an
 * unauthenticated request is redirected rather than sent a page that JavaScript
 * then hides. Reading a cookie makes this route dynamic, which is what we want —
 * a prerendered portal page would be served to anyone who asked.
 *
 * `currentClient` re-checks the account's status on every request, not just at
 * sign-in, so a client deactivated ten seconds ago does not get one more page
 * view out of a session that has already been revoked.
 *
 * Contents are deliberately thin: log in, stay signed in, log out is the whole
 * agreed scope. What makes this extensible is underneath it — the session layer
 * is complete rather than minimal, so adding a panel later is adding a panel,
 * not revisiting authentication.
 */
export default async function ClientPortalPage() {
  const client = await currentClient();
  if (!client) redirect("/clients/login");

  const firstName = client.name.split(" ")[0];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-electric/60"
          aria-label="BlueX home"
        >
          <span className="grid size-9 place-content-center rounded-lg bg-electric">
            <svg
              width="18"
              height="auto"
              viewBox="0 0 50 39"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="fill-white"
              aria-hidden
            >
              <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" />
              <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" />
            </svg>
          </span>
          <span className="font-heading text-base font-semibold tracking-tight text-ink">
            Client portal
          </span>
        </Link>

        <ClientLogoutButton />
      </header>

      <main className="mt-12 flex-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
          You are signed in
          {client.company ? (
            <>
              {" "}
              as <span className="text-ink">{client.company}</span>
            </>
          ) : null}
          . This is where your call activity and lead history will appear.
        </p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
          <h2 className="font-heading text-base font-semibold text-ink">
            Your details
          </h2>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Name
              </dt>
              <dd className="mt-1 text-sm text-ink">{client.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                Email
              </dt>
              <dd className="mt-1 break-words text-sm text-ink">
                {client.email}
              </dd>
            </div>
            {client.company ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-muted">
                  Company
                </dt>
                <dd className="mt-1 text-sm text-ink">{client.company}</dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-6 border-t border-white/[0.08] pt-5 text-[0.8125rem] leading-relaxed text-ink-muted">
            Something look wrong?{" "}
            <Link
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-ink underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-electric"
            >
              Tell us
            </Link>{" "}
            and we will correct it.
          </p>
        </div>
      </main>
    </div>
  );
}
