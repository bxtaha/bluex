"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2 } from "lucide-react";

/** Mirrors MIN_PASSWORD_LENGTH on the server, which is the one that enforces. */
const MIN_LENGTH = 8;

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

/**
 * Change password.
 *
 * The checks here are conveniences — they save a round trip and give immediate
 * feedback. Every one of them is repeated on the server, which is the only
 * place any of it is enforced: this component can be edited in devtools by
 * anyone looking at it.
 */
export function AdminChangePassword({ email }: { email: string }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(false);

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data: { ok?: boolean; message?: string; reauth?: boolean } =
        await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        setError(data.message ?? "Could not change the password.");
        setPending(false);
        return;
      }

      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPending(false);

      // The server reissued this browser's session; refresh so the app is
      // holding the new cookie rather than a revoked one.
      if (data.reauth) router.replace("/admin/login");
      else router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-1 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Change password
          </h3>
        </div>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Signed in as {email}. Changing this signs out every other device.
        </p>

        <form onSubmit={onSubmit}>
          <label
            htmlFor="current-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={`mt-1.5 ${FIELD_CLASS}`}
          />

          <label
            htmlFor="new-password"
            className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-describedby="new-password-hint"
            className={`mt-1.5 ${FIELD_CLASS}`}
          />
          <p
            id="new-password-hint"
            className={`mt-1.5 text-xs ${
              tooShort
                ? "text-red-600 dark:text-red-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            At least {MIN_LENGTH} characters.
          </p>

          <label
            htmlFor="confirm-password"
            className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={`mt-1.5 ${FIELD_CLASS}`}
          />
          {mismatch && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              These do not match.
            </p>
          )}

          <p
            role="alert"
            aria-live="polite"
            className={`mt-4 text-sm ${
              error
                ? "text-red-600 dark:text-red-400"
                : done
                  ? "flex items-center gap-1.5 text-green-600 dark:text-green-400"
                  : "sr-only"
            }`}
          >
            {done && !error && <Check className="h-4 w-4" aria-hidden />}
            {error ?? (done ? "Password changed." : "")}
          </p>

          <button
            type="submit"
            disabled={pending || tooShort || mismatch}
            className="mt-5 flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
