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
import { AdminBlogManager } from "@/components/ui/admin-blog-manager";
import { AdminProjectsManager } from "@/components/ui/admin-projects-manager";
import {
  Home,
  Tag,
  ChevronsRight,
  LogOut,
  Moon,
  Sun,
  Settings,
  Inbox,
  AtSign,
  PenLine,
  PhoneCall,
  Briefcase,
} from "lucide-react";

type IconType = React.ComponentType<{ className?: string }>;

/**
 * Collapsible-sidebar admin dashboard.
 *
 * Every item in the sidebar goes somewhere that works. The upstream component
 * this started from shipped a storefront's worth of demo furniture — sales
 * totals, an activity feed, a top-products table, a bell and an account button
 * that opened nothing — and all of it has been removed rather than left to look
 * like data. An admin panel that displays $24,567 of revenue for an agency that
 * sells two things is not a placeholder, it is a lie with a border-radius.
 *
 * The "Dashboard" item is the one exception: it is kept as an empty state
 * because it is going to hold a real overview, and the numbers for it (leads
 * awaiting a call, unread conversations) are already flowing into this
 * component for the sidebar badges.
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
}) {
  // The theme class is owned by the layout's provider, not by this page — the
  // login screen shares the area and has to agree with it. This only reads the
  // current value and asks for changes.
  const { isDark, setIsDark } = useAdminTheme();
  // Lifted out of the sidebar: the content area has to render according to the
  // same selection, and two copies of that state would drift.
  const [selected, setSelected] = useState("Dashboard");
  // Lifted for the same reason: the badge lives in the sidebar and the number
  // is discovered by the inbox, so one of them has to own it and it cannot be
  // the one that only sometimes renders.
  const [unreadCount, setUnreadCount] = useState(unread);
  const [attentionCount, setAttentionCount] = useState(attention);

  // Stable, or the inbox's fetch effect re-runs on every parent render and
  // polls the server in a loop.
  const handleUnread = useCallback((count: number) => setUnreadCount(count), []);
  const handleAttention = useCallback(
    (count: number) => setAttentionCount(count),
    [],
  );

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <Sidebar
          email={email}
          name={name}
          selected={selected}
          setSelected={setSelected}
          unread={unreadCount}
          attention={attentionCount}
        />
        <DashboardContent
          isDark={isDark}
          setIsDark={setIsDark}
          selected={selected}
          email={email}
          tiers={tiers}
          contact={contact}
          posts={posts}
          projects={projects}
          footnote={footnote}
          onUnreadChange={handleUnread}
          onAttentionChange={handleAttention}
        />
      </div>
    </div>
  );
}

function Sidebar({
  email,
  name,
  selected,
  setSelected,
  unread,
  attention,
}: {
  email: string;
  name?: string;
  selected: string;
  setSelected: (title: string) => void;
  unread: number;
  attention: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    // `refresh` first so the server re-reads the now-cleared cookie; otherwise
    // the router can answer /admin from cache and appear still signed in.
    router.refresh();
    router.replace("/admin/login");
  }

  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r p-2 shadow-sm transition-all duration-300 ease-in-out ${
        open ? "w-64" : "w-16"
      } border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900`}
    >
      <TitleSection open={open} email={email} name={name} />

      {/* Scrolls if the viewport is short, and stops above the collapse toggle,
          which is pinned to the bottom of the sidebar. Both axes stated —
          `overflow-y` alone computes `overflow-x` to `auto` and grows a phantom
          horizontal scrollbar. */}
      <div className="mb-8 max-h-[calc(100vh-13rem)] space-y-1 overflow-hidden overflow-y-auto">
        <Option
          Icon={Home}
          title="Dashboard"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        {/* Above the inbox on purpose: a lead nobody has called is the most
            time-sensitive thing this dashboard can be holding.

            `undefined` rather than 0 when there is nothing waiting — `Option`
            renders any number it is given, and a badge reading "0" is a
            notification that there are no notifications. */}
        <Option
          Icon={PhoneCall}
          title="Leads"
          selected={selected}
          setSelected={setSelected}
          open={open}
          notifs={attention > 0 ? attention : undefined}
        />
        <Option
          Icon={Inbox}
          title="Inbox"
          selected={selected}
          setSelected={setSelected}
          open={open}
          notifs={unread > 0 ? unread : undefined}
        />

        {/* One editor per section of the site, in the order those sections
            appear on it, so the sidebar can be read against the page. */}
        <Group label="Site content" open={open} />
        <Option
          Icon={Briefcase}
          title="Work"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={Tag}
          title="Pricing"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={PenLine}
          title="Blog"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={AtSign}
          title="Contact"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />

        <Group label="Account" open={open} />
        <Option
          Icon={Settings}
          title="Settings"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={LogOut}
          title="Sign out"
          selected={selected}
          setSelected={setSelected}
          open={open}
          onSelect={signOut}
        />
      </div>

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
}

/**
 * A heading between groups of sidebar items.
 *
 * Collapsed, there is no room for the words, so it becomes a rule — the
 * grouping is the useful part and it survives at 64px wide. `aria-hidden`
 * either way: this is a visual grouping over a flat list of buttons, and
 * announcing a heading that labels nothing programmatically is worse than
 * silence.
 */
function Group({ label, open }: { label: string; open: boolean }) {
  if (!open) {
    return (
      <div
        aria-hidden
        className="mx-3 !mt-3 mb-1 border-t border-gray-200 pt-1 dark:border-gray-800"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="!mt-5 border-t border-gray-200 px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400"
    >
      {label}
    </div>
  );
}

function Option({
  Icon,
  title,
  selected,
  setSelected,
  open,
  notifs,
  onSelect,
}: {
  Icon: IconType;
  title: string;
  selected: string;
  setSelected: (title: string) => void;
  open: boolean;
  notifs?: number;
  /** Runs instead of marking the item current — for actions, not destinations. */
  onSelect?: () => void;
}) {
  const isSelected = selected === title;

  return (
    <button
      type="button"
      onClick={() => (onSelect ? onSelect() : setSelected(title))}
      title={open ? undefined : title}
      aria-current={isSelected ? "page" : undefined}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected
          ? "border-l-2 border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/50 dark:text-blue-300"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className="h-4 w-4" />
      </div>

      {open && <span className="text-sm font-medium">{title}</span>}

      {/* `!= null` rather than a truthy check: `notifs={0}` is a real value and
          a bare `notifs &&` would render the number 0 into the markup. */}
      {notifs != null && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white dark:bg-blue-600">
          {notifs}
        </span>
      )}
    </button>
  );
}

function TitleSection({
  open,
  email,
  name,
}: {
  open: boolean;
  email: string;
  name?: string;
}) {
  return (
    <div className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-800">
      {/* Not a button and no caret: this identifies the signed-in account, it
          does not open anything. The caret that used to sit on the right
          promised a menu that never existed. */}
      <div className="rounded-md p-2">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div>
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                {name ?? "BlueX"}
              </span>
              {/* The real signed-in account, not a hardcoded plan name — it is
                  the one place that confirms who you are actually acting as. */}
              <span className="block max-w-[9rem] truncate text-xs text-gray-500 dark:text-gray-400">
                {email}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
      <svg
        width="20"
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
  );
}

function ToggleClose({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      className="absolute bottom-0 left-0 right-0 border-t border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 text-gray-500 transition-transform duration-300 dark:text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Hide
          </span>
        )}
      </div>
    </button>
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
  Inbox: {
    title: "Inbox",
    subtitle: "Contact-form submissions and email, in one place",
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
  subtitle: "Welcome back to your dashboard",
};

function DashboardContent({
  isDark,
  setIsDark,
  selected,
  email,
  tiers,
  contact,
  posts,
  projects,
  footnote,
  onUnreadChange,
  onAttentionChange,
}: {
  isDark: boolean;
  setIsDark: (next: boolean) => void;
  selected: string;
  email: string;
  tiers: PricingTier[];
  contact: ContactSettings;
  posts: PostCard[];
  projects: Project[];
  footnote: string;
  onUnreadChange: (count: number) => void;
  onAttentionChange: (count: number) => void;
}) {
  const view = VIEWS[selected] ?? OVERVIEW;
  const isOverview = view === OVERVIEW;

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6 dark:bg-gray-950">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {view.title}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
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
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {selected === "Leads" && (
        <AdminLeads onAttentionChange={onAttentionChange} />
      )}
      {selected === "Inbox" && <AdminInbox onUnreadChange={onUnreadChange} />}
      {selected === "Settings" && <AdminChangePassword email={email} />}
      {selected === "Pricing" && <AdminPricingManager initial={tiers} />}
      {selected === "Work" && (
        <AdminProjectsManager initial={projects} initialFootnote={footnote} />
      )}
      {selected === "Blog" && <AdminBlogManager initial={posts} />}
      {selected === "Contact" && <AdminContactManager initial={contact} />}
      {isOverview && (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Nothing here yet. Pick a section from the sidebar.
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
