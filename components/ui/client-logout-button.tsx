"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/**
 * Sign out.
 *
 * A button posting to the endpoint, not a link. A GET that ends a session can be
 * triggered by an `<img>` tag on any other site, which is a small but real way to
 * annoy someone; it is also the sort of thing a link prefetcher can fire without
 * anyone clicking.
 *
 * `router.refresh()` before navigating, so the server re-reads the cookie it was
 * just told to clear. Without it the login page can be answered from the client
 * router's cache, see a session that no longer exists, and redirect straight back
 * into the portal.
 */
export function ClientLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);

    try {
      await fetch("/api/clients/logout", { method: "POST" });
    } catch {
      // Deliberately ignored. The cookie is cleared by the response when there is
      // one, and if the request never arrived there is nothing useful to say —
      // sending them to the sign-in page either way is the honest outcome, and a
      // session they cannot reach is one they cannot use.
    }

    router.refresh();
    router.replace("/clients/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/12 px-3 text-[0.8125rem] font-medium text-ink-muted transition-colors hover:border-white/25 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/70"
          aria-hidden
        />
      ) : (
        <LogOut className="size-3.5" aria-hidden />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
