import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/ui/admin-login-form";

/** Already signed in? Then this page has nothing to offer. */
export default async function AdminLoginPage() {
  const store = await cookies();

  if (isValidSession(store.get(SESSION_COOKIE)?.value)) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
