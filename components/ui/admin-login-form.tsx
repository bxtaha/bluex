"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LogIn, Mail } from "lucide-react";

/**
 * Admin sign-in.
 *
 * Holds no credentials of its own — it posts what was typed and reacts to the
 * status. Everything that decides whether those details are right lives in
 * `/api/admin/login`, on the server, which is why nothing secret is in this
 * bundle.
 *
 * Styled to the dashboard behind it (the gray/blue Tailwind scale) rather than
 * to the marketing site's tokens: the two are different applications that
 * happen to share a domain, and the admin area should not look like a landing
 * page.
 */
export function AdminLoginForm({ notice }: { notice?: string }) {
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
      const response = await fetch("/api/admin/login", {
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
      // just issued; without it the admin route can be answered from the
      // client router's cache and bounce straight back to this page.
      router.refresh();
      router.replace("/admin");
    } catch {
      setError("Could not reach the server. Check your connection.");
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid size-12 place-content-center rounded-xl bg-electric">
            <svg
              width="24"
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
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Admin sign in
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            BlueX dashboard
          </p>
        </div>

        {/* See client-login-form for the reasoning: `method="post"` so a
            native submit — which is what happens if this form is used before
            hydration finishes — cannot write the password into the query
            string, where it would reach browser history and the access log. */}
        <form
          onSubmit={onSubmit}
          method="post"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <label
            htmlFor="admin-email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <div className="relative mt-1.5">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-electric focus:ring-2 focus:ring-electric/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="you@example.com"
            />
          </div>

          <label
            htmlFor="admin-password"
            className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <div className="relative mt-1.5">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-electric focus:ring-2 focus:ring-electric/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="••••••••"
            />
          </div>

          {/* Announced when it appears, so it is not a purely visual failure. */}
          <p
            role="alert"
            aria-live="polite"
            className={`mt-4 text-sm text-red-600 dark:text-red-400 ${
              error ? "" : "sr-only"
            }`}
          >
            {error}
          </p>

          <button
            type="submit"
            disabled={pending}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-electric text-sm font-medium text-white transition-colors hover:bg-electric-glow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LogIn className="size-4" aria-hidden />
            )}
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
