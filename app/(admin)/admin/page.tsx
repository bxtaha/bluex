import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";
import { listAllTiers, type PricingTier } from "@/lib/pricing";
import { listAllFaqs, type Faq } from "@/lib/faq";
import {
  DEFAULT_CONTACT,
  getContactSettings,
  type ContactSettings,
} from "@/lib/contact";
import { unreadThreadCount } from "@/lib/message-store";
import { listAllPosts, type PostCard } from "@/lib/blog";
import {
  DEFAULT_FOOTNOTE,
  getFootnote,
  listAllProjects,
  type Project,
} from "@/lib/projects";
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
  let faqs: Faq[] = [];
  let contact: ContactSettings = DEFAULT_CONTACT;
  // The badge, not the inbox itself. The thread list is fetched by the client
  // because mail arrives while the tab is open and a server snapshot of it
  // would be stale before anyone read it; the count is cheap and it has to be
  // right in the sidebar before the Inbox view is ever opened.
  let unread = 0;
  let posts: PostCard[] = [];
  let projects: Project[] = [];
  let footnote = DEFAULT_FOOTNOTE;

  try {
    [tiers, faqs, contact, unread, posts, projects, footnote] =
      await Promise.all([
        listAllTiers(),
        listAllFaqs(),
        getContactSettings(),
        unreadThreadCount(),
        listAllPosts(),
        listAllProjects(),
        getFootnote(),
      ]);
  } catch (error) {
    // The dashboard is still worth showing without them; the pricing view will
    // simply start empty rather than taking the whole page down.
    console.error("[admin] could not load editor content:", error);
  }

  return (
    <AdminDashboard
      email={user.email}
      name={user.name}
      tiers={tiers}
      faqs={faqs}
      contact={contact}
      posts={posts}
      projects={projects}
      footnote={footnote}
      unread={unread}
    />
  );
}
