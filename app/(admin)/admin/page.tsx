import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";
import { listAllTiers, type PricingTier } from "@/lib/pricing";
import {
  DEFAULT_CONTACT,
  getContactSettings,
  type ContactSettings,
} from "@/lib/contact";
import { unreadThreadCount } from "@/lib/message-store";
import { needsAttentionCount } from "@/lib/lead-store";
import { countClients } from "@/lib/client-auth";
import { isConfigured } from "@/lib/elevenlabs";
import { isMailConfigured } from "@/lib/mailer";
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
  let contact: ContactSettings = DEFAULT_CONTACT;
  // The badge, not the inbox itself. The thread list is fetched by the client
  // because mail arrives while the tab is open and a server snapshot of it
  // would be stale before anyone read it; the count is cheap and it has to be
  // right in the sidebar before the Inbox view is ever opened.
  let unread = 0;
  // Same reasoning as `unread`, and the same trade: the leads panel fetches its
  // own list because leads arrive while the tab is open, but the badge has to
  // be right before anyone opens it.
  let attention = 0;
  let posts: PostCard[] = [];
  let projects: Project[] = [];
  let footnote = DEFAULT_FOOTNOTE;
  // The overview leads with what needs a decision, and an outstanding invitation
  // is one of those. Read here for the same reason as the other badges: it has to
  // be right before anyone opens the Clients panel, which is what keeps it
  // current afterwards.
  let clientCounts = { total: 0, active: 0, invited: 0, suspended: 0 };
  // Now a Mongo read rather than a synchronous env check — see
  // `lib/voice-settings.ts` — so it belongs in the same `Promise.all` as
  // everything else here rather than a bare `await` below that could throw
  // and take the whole page down over one unreachable read.
  let voiceConfigured = false;

  try {
    [tiers, contact, unread, attention, posts, projects, footnote, clientCounts, voiceConfigured] =
      await Promise.all([
        listAllTiers(),
        getContactSettings(),
        unreadThreadCount(),
        needsAttentionCount(),
        listAllPosts(),
        listAllProjects(),
        getFootnote(),
        countClients(),
        isConfigured(),
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
      contact={contact}
      posts={posts}
      projects={projects}
      footnote={footnote}
      unread={unread}
      attention={attention}
      clientCounts={clientCounts}
      // Both of these fail silently in production — leads are stored but never
      // called, clients are created but never emailed — so the overview says so
      // rather than leaving someone to discover it from a customer.
      voiceConfigured={voiceConfigured}
      mailConfigured={isMailConfigured()}
    />
  );
}
