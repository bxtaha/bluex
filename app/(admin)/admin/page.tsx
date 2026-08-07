import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/ui/dashboard-with-collapsible-sidebar";

/**
 * The gate.
 *
 * Checked on the server, before any markup is produced, so an unauthenticated
 * request is redirected rather than served a dashboard that JavaScript then
 * hides. A client-side guard would ship the whole page to anyone who asked and
 * rely on them not looking.
 *
 * Reading a cookie makes this request dynamic, so it is never prerendered or
 * cached — which is what we want, and worth stating because a statically
 * rendered admin page would be a hole.
 */
export default async function AdminPage() {
  const store = await cookies();

  if (!isValidSession(store.get(SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
