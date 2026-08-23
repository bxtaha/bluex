import { redirect } from "next/navigation";
import Link from "next/link";
import { ClientAuthShell } from "@/components/ui/client-auth-shell";
import { ClientLoginForm } from "@/components/ui/client-login-form";
import { currentClient } from "@/lib/client-guard";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The sign-in page.
 *
 * Already-authenticated visitors are sent to the portal rather than shown a form
 * they do not need. Reading the cookie makes this route dynamic, which is what we
 * want — a prerendered sign-in page would be served from a cache to someone who
 * is already signed in.
 */
export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentClient()) redirect("/clients");

  const { error } = await searchParams;

  // A closed set of messages, looked up by key. The alternative — rendering the
  // query string — is a reflected-XSS shape and, even sanitised, lets anyone put
  // arbitrary words on our sign-in page by sending someone a link.
  const notices: Record<string, string> = {
    unavailable: "Sign in is unavailable right now. Try again shortly.",
    expired: "Your session has expired. Sign in again.",
  };

  return (
    <ClientAuthShell
      title="Client sign in"
      subtitle="Access your BlueX client portal."
      footer={
        <>
          Need access?{" "}
          <Link
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-ink underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-electric"
          >
            Get in touch
          </Link>
        </>
      }
    >
      <ClientLoginForm notice={error ? notices[error] : undefined} />
    </ClientAuthShell>
  );
}
