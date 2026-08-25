"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Lock, Mail } from "lucide-react";
import {
  ClientField,
  ClientFormError,
  ClientSubmit,
} from "@/components/ui/client-form-fields";

/**
 * Client portal sign-in.
 *
 * Holds no credentials of its own — it posts what was typed and reacts to the
 * status. Everything that decides whether those details are right lives in
 * `/api/clients/login`, on the server, which is why nothing secret is in this
 * bundle.
 *
 * Note what this does *not* do: it never explains *why* a sign-in failed beyond
 * what the server said. The server deliberately returns one message for a wrong
 * password, an unknown address, an unfinished setup and a deactivated account,
 * because distinguishing them would confirm to anyone typing addresses which of
 * them are real customers of ours. Adding a friendlier client-side guess here
 * would undo that.
 */
export function ClientLoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(notice ?? null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/clients/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: { ok?: boolean; message?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.ok) {
        setError(data.message ?? "Sign in failed. Try again.");
        setPending(false);
        return;
      }

      // `refresh` before `replace` so the server re-evaluates the session it
      // just issued. Without it the portal route can be answered from the client
      // router's cache and bounce straight back here — the same trap the admin
      // form hit.
      router.refresh();
      router.replace("/clients");
    } catch {
      setError("Could not reach the server. Check your connection.");
      setPending(false);
    }
  }

  /* `method="post"` although this form is always submitted by the handler
     above, which calls `preventDefault`. It is the no-JS fallback that
     matters: without it a native submit defaults to GET and puts the password
     in the query string, where it lands in browser history, the server access
     log and any outgoing Referer header. Seen for real — a page whose JS had
     not hydrated navigated to `?email=...&password=...`. POST cannot render a
     password into a URL, so the failure mode becomes a harmless 405 instead of
     a credential leak. */
  return (
    <form onSubmit={onSubmit} method="post" noValidate>
      <div className="space-y-4">
        <ClientField
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={setEmail}
          autoComplete="username"
          placeholder="you@company.com"
          icon={Mail}
          disabled={pending}
        />

        <ClientField
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="••••••••"
          icon={Lock}
          disabled={pending}
        />
      </div>

      <ClientFormError message={error} />

      <ClientSubmit pending={pending} pendingLabel="Signing in…" icon={LogIn}>
        Sign in
      </ClientSubmit>
    </form>
  );
}
