"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock } from "lucide-react";
import {
  ClientField,
  ClientFormError,
  ClientSubmit,
} from "@/components/ui/client-form-fields";

/**
 * Choosing a password from an invitation link.
 *
 * The token comes from the URL and is passed straight back to the server. It is
 * never stored anywhere by this component — not in state that outlives the
 * submit, not in localStorage — because it is a credential, and the browser's
 * URL bar is already one place too many for it to live.
 *
 * The length rule is checked here *and* on the server. This copy exists so
 * someone learns about it before submitting; the server's copy is the one that
 * decides. Client-side validation is a courtesy, and this file could be edited by
 * whoever is looking at it.
 */
export function ClientSetupForm({
  token,
  email,
  minLength,
}: {
  token: string;
  /** Shown, not editable — the invitation decides which account this sets up. */
  email: string;
  minLength: number;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < minLength) {
      setFieldError(`At least ${minLength} characters.`);
      return;
    }

    setPending(true);
    setFieldError(undefined);
    setError(null);

    try {
      const response = await fetch("/api/clients/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data: { ok?: boolean; message?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.ok) {
        setError(data.message ?? "Could not set your password. Try again.");
        setPending(false);
        return;
      }

      // The server signs them in as part of setup, so this goes to the portal
      // rather than back to a login form. Being asked to retype the password
      // chosen four seconds ago reads like the first one did not work.
      router.refresh();
      router.replace("/clients");
    } catch {
      setError("Could not reach the server. Check your connection.");
      setPending(false);
    }
  }

  /* See client-login-form: `method="post"` so a native submit before
     hydration cannot put the password in the URL. */
  return (
    <form onSubmit={onSubmit} method="post" noValidate>
      {/* Read-only rather than absent: someone arriving from an email days later
          should be able to see which account they are about to set up, and an
          editable field here would imply they could set up a different one. */}
      <div>
        <span className="block text-[0.8125rem] font-medium text-ink">
          Account
        </span>
        <p className="mt-2 flex h-11 items-center rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-sm text-ink-muted">
          {email}
        </p>
      </div>

      <div className="mt-4">
        <ClientField
          label="Choose a password"
          type="password"
          name="password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (fieldError) setFieldError(undefined);
          }}
          // `new-password` rather than `current-password`, which is what tells a
          // password manager to offer to generate and save one instead of
          // autofilling something that does not exist yet.
          autoComplete="new-password"
          placeholder="••••••••"
          icon={Lock}
          error={fieldError}
          hint={`At least ${minLength} characters. Longer is better than complicated.`}
          disabled={pending}
        />
      </div>

      <ClientFormError message={error} />

      <ClientSubmit
        pending={pending}
        pendingLabel="Setting up…"
        icon={KeyRound}
      >
        Set password and sign in
      </ClientSubmit>
    </form>
  );
}
