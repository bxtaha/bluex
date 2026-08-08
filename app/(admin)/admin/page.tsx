import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";
import { listAllTiers, type PricingTier } from "@/lib/pricing";
import { AdminDashboard } from "@/components/ui/dashboard-with-collapsible-sidebar";

/**
 * The gate.
 *
 * Resolved on the server, before any markup exists, so an unauthenticated
 * request is redirected rather than sent a dashboard that JavaScript then
 * hides. Reading a cookie makes the route dynamic, which is what we want — a
 * prerendered admin page would be served to anyone.
 */
export default async function AdminPage() {
  const store = await cookies();

  let user;
  try {
    user = await getSessionUser(store.get(SESSION_COOKIE)?.value);
  } catch (error) {
    // Fail closed. If the session store cannot be reached we do not know
    // whether this request is authorised, and the safe answer is no.
    console.error("[admin] could not verify session:", error);
    redirect("/admin/login?error=unavailable");
  }

  if (!user) redirect("/admin/login");

  // Read here rather than fetched by the client when the Pricing view opens:
  // the editor then renders with its rows already present instead of flashing
  // an empty list, and there is no second round trip after the page arrives.
  let tiers: PricingTier[] = [];
  try {
    tiers = await listAllTiers();
  } catch (error) {
    // The dashboard is still worth showing without them; the pricing view will
    // simply start empty rather than taking the whole page down.
    console.error("[pricing] could not load tiers:", error);
  }

  return <AdminDashboard email={user.email} name={user.name} tiers={tiers} />;
}
