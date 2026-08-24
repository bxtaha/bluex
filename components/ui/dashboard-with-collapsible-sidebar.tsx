"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingTier } from "@/lib/pricing";
import type { ContactSettings } from "@/lib/contact-store";
import type { PostCard } from "@/lib/blog-store";
import type { Project } from "@/lib/project-store";
import { useAdminTheme } from "@/components/providers/admin-theme";
import { AdminChangePassword } from "@/components/ui/admin-change-password";
import { AdminPricingManager } from "@/components/ui/admin-pricing-manager";
import { AdminContactManager } from "@/components/ui/admin-contact-manager";
import { AdminInbox } from "@/components/ui/admin-inbox";
import { AdminLeads } from "@/components/ui/admin-leads";
import { AdminCalls } from "@/components/ui/admin-calls";
import { AdminBlogManager } from "@/components/ui/admin-blog-manager";
import { AdminProjectsManager } from "@/components/ui/admin-projects-manager";
import { AdminClients } from "@/components/ui/admin/admin-clients";
import {
  AdminOverview,
  type OverviewData,
} from "@/components/ui/admin/admin-overview";
import {
  AdminSidebar,
  type NavGroup,
} from "@/components/ui/admin/admin-sidebar";
import {
  AtSign,
  Briefcase,
  Home,
  Inbox,
  LogOut,
  Menu,
  Moon,
  PenLine,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Settings,
  Sun,
  Tag,
  Users,
} from "lucide-react";

/**
 * The admin dashboard.
 *
 * Every item in the sidebar goes somewhere that works. The upstream component
 * this started from shipped a storefront's worth of demo furniture — sales
 * totals, an activity feed, a top-products table, a bell and an account button
 * that opened nothing — and all of it has been removed rather than left to look
 * like data. An admin panel that displays $24,567 of revenue for an agency that
 * sells two things is not a placeholder, it is a lie with a border-radius.
 *
 * The chrome now comes from `components/ui/admin/`. Eight panels had each grown
 * their own card, table header, empty state and button, and the copies had
 * drifted into three radii and four spellings of "nothing here yet" — which is
 * most of why this read as a template. The panels' own logic is untouched; only
 * their surroundings moved.
 *
 * Two things changed structurally rather than visually:
 *
 * - **The sidebar is a drawer below `lg`.** It used to be a fixed 256px column at
 *   every width, so on a 390px phone it took two thirds of the screen and left
 *   the content unusable. This dashboard gets checked between calls at least as
 *   often as at a desk.
 * - **"Dashboard" is a real view.** It was a dashed box reading "Nothing here
 *   yet"; the counts it needed were already flowing through this component for
 *   the sidebar badges.
 */
export function AdminDashboard({
  email,
  name,
  tiers,
  contact,
  posts,
  projects,
  footnote,
  unread,
  attention,
  clientCounts,
  voiceConfigured,
  mailConfigured,
}: {
  /** The signed-in account, resolved on the server by the page's guard. */
  email: string;
  name?: string;
  /** Read on the server so the editors have data before they are opened. */
  tiers: PricingTier[];
  contact: ContactSettings;
  posts: PostCard[];
  projects: Project[];
  footnote: string;
  /** Unread conversations at page load. The inbox keeps it current after that. */
  unread: number;
  /** Leads nobody has reached yet. The leads panel keeps it current after that. */
  attention: number;
  clientCounts: { total: number; active: number; invited: number; suspended: number };
  /** Whether the voice agent and mail are wired up — both fail silently. */
  voiceConfigured: boolean;
  mailConfigured: boolean;
}) {
  const router = useRouter();
  // The theme class is owned by the layout's provider, not by this page — the
  // login screen shares the area and has to agree with it. This only reads the
  // current value and asks for changes.
  const { isDark, setIsDark } = useAdminTheme();
  // Lifted out of the sidebar: the content area has to render according to the
  // same selection, and two copies of that state would drift.
  const [selected, setSelected] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Lifted for the same reason: the badge lives in the sidebar and the number
  // is discovered by the panel, so one of them has to own it and it cannot be
  // the one that only sometimes renders.
  const [unreadCount, setUnreadCount] = useState(unread);
  const [attentionCount, setAttentionCount] = useState(attention);
  const [invitedCount, setInvitedCount] = useState(clientCounts.invited);

  // Stable, or the inbox's fetch effect re-runs on every parent render and
  // polls the server in a loop.
  const handleUnread = useCallback((count: number) => setUnreadCount(count), []);
  const handleAttention = useCallback(
    (count: number) => setAttentionCount(count),
    [],
  );
  const handleInvited = useCallback((count: number) => setInvitedCount(count), []);
  // Handed down to the Calls panel so its "view this lead" link can switch
  // the sidebar's own tab — the selection lives here, not in the panel.
  const handleViewLeads = useCallback(() => setSelected("Leads"), []);

  const signOut = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    // `refresh` first so the server re-reads the now-cleared cookie; otherwise
    // the router can answer /admin from cache and appear still signed in.
    router.refresh();
    router.replace("/admin/login");
  }, [router]);

  const groups: NavGroup[] = [
    {
      items: [
        { title: "Dashboard", icon: Home },
        // Above the inbox on purpose: a lead nobody has called is the most
        // time-sensitive thing this dashboard can be holding.
        //
        // `undefined` rather than 0 when there is nothing waiting — the badge
        // renders any number it is given, and one reading "0" is a notification
        // that there are no notifications.
        {
          title: "Leads",
          icon: PhoneCall,
          badge: attentionCount > 0 ? attentionCount : undefined,
        },
        // Two entries, not one "Calls" with a filter inside it — the split
        // is what makes each direction's volume visible without opening the
        // panel. No badge on either: "unread" is not a concept that applies
        // to an archive.
        { title: "Inbound Calls", icon: PhoneIncoming },
        { title: "Outbound Calls", icon: PhoneOutgoing },
        {
          title: "Inbox",
          icon: Inbox,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        {
          title: "Clients",
          icon: Users,
          badge: invitedCount > 0 ? invitedCount : undefined,
        },
      ],
    },
    {
      // One editor per section of the site, in the order those sections appear
      // on it, so the sidebar can be read against the page.
      label: "Site content",
      items: [
        { title: "Work", icon: Briefcase },
        { title: "Pricing", icon: Tag },
        { title: "Blog", icon: PenLine },
        { title: "Contact", icon: AtSign },
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Settings", icon: Settings },
        { title: "Sign out", icon: LogOut, onSelect: signOut },
      ],
    },
  ];

  const overview: OverviewData = {
    attention: attentionCount,
    unread: unreadCount,
    invited: invitedCount,
    clientsTotal: clientCounts.total,
    clientsActive: clientCounts.active,
    posts: posts.length,
    projects: projects.length,
    voiceConfigured,
    mailConfigured,
  };

  const view = VIEWS[selected] ?? OVERVIEW;

  return (
    <div className="flex min-h-dvh w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <AdminSidebar
        groups={groups}
        selected={selected}
        onSelect={setSelected}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        header={
          <AccountBadge
            email={email}
            name={name}
            compact={!sidebarOpen && !drawerOpen}
          />
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-gray-200 bg-gray-50/85 px-4 py-3 backdrop-blur-sm sm:px-6 dark:border-gray-800 dark:bg-gray-950/85">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid size-9 shrink-0 place-content-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:text-gray-900 motion-reduce:transition-none lg:hidden dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Menu className="size-4" aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight text-gray-900 sm:text-lg dark:text-gray-100">
              {view.title}
            </h1>
            <p className="truncate text-[0.8125rem] text-gray-500 dark:text-gray-400">
              {view.subtitle}
            </p>
          </div>

          {/* The theme toggle is the only control here that ever did anything.
              The bell beside it opened nothing — the sidebar badges are the real
              notification surface — and the account button opened nothing either,
              with the signed-in address already shown at the top of the sidebar
              and Settings one click below it. */}
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="grid size-9 shrink-0 place-content-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:text-gray-900 motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            {isDark ? (
              <Sun className="size-4" aria-hidden />
            ) : (
              <Moon className="size-4" aria-hidden />
            )}
          </button>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {/* Capped so tables and prose do not stretch to 2560px, where a row's
              first and last cell end up too far apart to read as one row. */}
          <div className="mx-auto max-w-6xl">
            {selected === "Leads" && (
              <AdminLeads onAttentionChange={handleAttention} />
            )}
            {selected === "Inbound Calls" && (
              <AdminCalls direction="inbound" onViewLeads={handleViewLeads} />
            )}
            {selected === "Outbound Calls" && (
              <AdminCalls direction="outbound" onViewLeads={handleViewLeads} />
            )}
            {selected === "Inbox" && <AdminInbox onUnreadChange={handleUnread} />}
            {selected === "Clients" && (
              <AdminClients onInvitedChange={handleInvited} />
            )}
            {selected === "Settings" && <AdminChangePassword email={email} />}
            {selected === "Pricing" && <AdminPricingManager initial={tiers} />}
            {selected === "Work" && (
              <AdminProjectsManager initial={projects} initialFootnote={footnote} />
            )}
            {selected === "Blog" && <AdminBlogManager initial={posts} />}
            {selected === "Contact" && <AdminContactManager initial={contact} />}
            {view === OVERVIEW && (
              <AdminOverview
                data={overview}
                onNavigate={setSelected}
                name={name}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Who you are signed in as.
 *
 * Not a button and no caret: this identifies the account, it does not open
 * anything. The caret that used to sit on the right promised a menu that never
 * existed.
 */
function AccountBadge({
  email,
  name,
  compact,
}: {
  email: string;
  name?: string;
  compact: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-content-center rounded-lg bg-electric">
        <svg
          width="18"
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

      {compact ? null : (
        <div className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-semibold text-gray-900 dark:text-gray-100">
            {name ?? "BlueX"}
          </span>
          {/* The real signed-in account, not a hardcoded plan name — it is the
              one place that confirms who you are actually acting as. */}
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
            {email}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Titles for each view.
 *
 * A lookup rather than the stack of nested ternaries this replaced. Six views
 * deep, the ternary version had the same key spelled out in two separate
 * chains — heading and subtitle — which is two places to forget when a seventh
 * arrives. Anything not listed here falls through to the overview, so an
 * unimplemented sidebar item shows the dashboard rather than a blank pane.
 */
const VIEWS: Record<string, { title: string; subtitle: string }> = {
  Leads: {
    title: "Leads",
    subtitle: "Callback requests and what the voice agent did with them",
  },
  "Inbound Calls": {
    title: "Inbound Calls",
    subtitle: "Calls the agent answered — including the ones a lead placed",
  },
  "Outbound Calls": {
    title: "Outbound Calls",
    subtitle: "Calls the agent placed to a lead",
  },
  Inbox: {
    title: "Inbox",
    subtitle: "Contact-form submissions and email, in one place",
  },
  Clients: {
    title: "Clients",
    subtitle: "Who can sign in to the client portal",
  },
  Pricing: {
    title: "Pricing",
    subtitle: "Tiers shown in the pricing section of the site",
  },
  Work: {
    title: "Selected work",
    subtitle: "Projects shown in the portfolio section of the site",
  },
  Blog: {
    title: "Blog",
    subtitle: "Posts, drafts and everything scheduled",
  },
  Contact: {
    title: "Contact",
    subtitle: "Details shown in the contact section of the site",
  },
  Settings: { title: "Settings", subtitle: "Manage your account" },
};

const OVERVIEW = {
  title: "Dashboard",
  subtitle: "What is waiting on you",
};

export default AdminDashboard;
