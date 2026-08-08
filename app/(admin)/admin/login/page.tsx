import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/ui/admin-login-form";

/** Already signed in? Then this page has nothing to offer. */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await cookies();

  // `redirect()` signals by throwing, so it must sit outside the try — a catch
  // around it swallows the signal and the redirect silently never happens.
  // Only the database call is guarded: a store that cannot be reached falls
  // through to the form rather than bouncing into a loop with the dashboard's
  // own guard.
  let signedIn = false;
  try {
    signedIn = (await getSessionUser(store.get(SESSION_COOKIE)?.value)) !== null;
  } catch {
    signedIn = false;
  }

  if (signedIn) redirect("/admin");

  const { error } = await searchParams;

  return (
    <AdminLoginForm
      notice={
        error === "unavailable"
          ? "Could not reach the sign-in service. Try again in a moment."
          : undefined
      }
    />
  );
}
