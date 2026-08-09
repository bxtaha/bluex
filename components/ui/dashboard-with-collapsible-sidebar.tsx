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
import { AdminBlogManager } from "@/components/ui/admin-blog-manager";
import { AdminProjectsManager } from "@/components/ui/admin-projects-manager";
import {
  Home,
  DollarSign,
  Monitor,
  ShoppingCart,
  Tag,
  Users,
  ChevronDown,
  ChevronsRight,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  Activity,
  Package,
  Bell,
  Settings,
  HelpCircle,
  Inbox,
  AtSign,
  PenLine,
  Briefcase,
  User,
} from "lucide-react";

type IconType = React.ComponentType<{ className?: string }>;

/**
 * Collapsible-sidebar admin dashboard.
 *
 * The figures below are placeholder and static. They are deliberately *not*
 * `Math.random()`, which the upstream component used for the product prices:
 * a random value produced during render differs between the server pass and the
 * client pass, and React reports that as a hydration mismatch. It is invisible
 * in a client-only sandbox and an error the moment the component is server
 * rendered, which it is here.
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

  // Stable, or the inbox's fetch effect re-runs on every parent render and
  // polls the server in a loop.
  const handleUnread = useCallback((count: number) => setUnreadCount(count), []);

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <Sidebar
          email={email}
          name={name}
          selected={selected}
          setSelected={setSelected}
          unread={unreadCount}
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
          unread={unreadCount}
          onUnreadChange={handleUnread}
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
}: {
  email: string;
  name?: string;
  selected: string;
  setSelected: (title: string) => void;
  unread: number;
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
        {/* `undefined` rather than 0 when there is nothing waiting — `Option`
            renders any number it is given, and a badge reading "0" is a
            notification that there are no notifications. */}
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
          Icon={Monitor}
          title="View site"
          selected={selected}
          setSelected={setSelected}
          open={open}
          onSelect={() => window.open("/", "_blank", "noopener,noreferrer")}
        />
        <Option
          Icon={Settings}
          title="Settings"
          selected={selected}
          setSelected={setSelected}
          open={open}
        />
        <Option
          Icon={HelpCircle}
          title="Help & Support"
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
      <div className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
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
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
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

const STATS = [
  {
    Icon: DollarSign,
    label: "Total Sales",
    value: "$24,567",
    delta: "+12% from last month",
    tint: "blue",
  },
  {
    Icon: Users,
    label: "Active Users",
    value: "1,234",
    delta: "+5% from last week",
    tint: "green",
  },
  {
    Icon: ShoppingCart,
    label: "Orders",
    value: "456",
    delta: "+8% from yesterday",
    tint: "purple",
  },
  {
    Icon: Package,
    label: "Products",
    value: "89",
    delta: "+3 new this week",
    tint: "orange",
  },
] as const;

const ACTIVITY = [
  {
    Icon: DollarSign,
    title: "New sale recorded",
    desc: "Order #1234 completed",
    time: "2 min ago",
    tint: "green",
  },
  {
    Icon: Users,
    title: "New user registered",
    desc: "john.doe@example.com joined",
    time: "5 min ago",
    tint: "blue",
  },
  {
    Icon: Package,
    title: "Product updated",
    desc: "iPhone 15 Pro stock updated",
    time: "10 min ago",
    tint: "purple",
  },
  {
    Icon: Activity,
    title: "System maintenance",
    desc: "Scheduled backup completed",
    time: "1 hour ago",
    tint: "orange",
  },
  {
    Icon: Bell,
    title: "New notification",
    desc: "Marketing campaign results",
    time: "2 hours ago",
    tint: "red",
  },
] as const;

/** Fixed, not random — see the note on `AdminDashboard`. */
const TOP_PRODUCTS = [
  { name: "iPhone 15 Pro", price: "$1,199" },
  { name: "MacBook Air M2", price: "$1,099" },
  { name: "AirPods Pro", price: "$249" },
  { name: "iPad Air", price: "$599" },
] as const;

/* Tailwind scans source for whole class names, so the tint classes are written
   out in full here. Building them as `bg-${tint}-50` produces strings the
   scanner never sees and the styles are simply absent from the bundle. */
const TINTS = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    fg: "text-blue-600 dark:text-blue-400",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-900/20",
    fg: "text-green-600 dark:text-green-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    fg: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    fg: "text-orange-600 dark:text-orange-400",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    fg: "text-red-600 dark:text-red-400",
  },
} as const;

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
  unread,
  onUnreadChange,
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
  unread: number;
  onUnreadChange: (count: number) => void;
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={
              unread > 0
                ? `Notifications — ${unread} unread conversations`
                : "Notifications"
            }
            className="relative rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Bell className="h-5 w-5" />
            {/* Only when something is actually waiting. A permanent red dot is
                a dot, not a notification. */}
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Account"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition-colors hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>

      {selected === "Inbox" && <AdminInbox onUnreadChange={onUnreadChange} />}
      {selected === "Settings" && <AdminChangePassword email={email} />}
      {selected === "Pricing" && <AdminPricingManager initial={tiers} />}
      {selected === "Work" && (
        <AdminProjectsManager initial={projects} initialFootnote={footnote} />
      )}
      {selected === "Blog" && <AdminBlogManager initial={posts} />}
      {selected === "Contact" && <AdminContactManager initial={contact} />}
      {isOverview && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${TINTS[stat.tint].bg}`}>
                    <stat.Icon className={`h-5 w-5 ${TINTS[stat.tint].fg}`} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="mb-1 font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  {stat.delta}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Recent Activity
                  </h3>
                  <button
                    type="button"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {ACTIVITY.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center space-x-4 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className={`rounded-lg p-2 ${TINTS[item.tint].bg}`}>
                        <item.Icon
                          className={`h-4 w-4 ${TINTS[item.tint].fg}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {item.desc}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Quick Stats
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      label: "Conversion Rate",
                      value: "3.2%",
                      pct: 32,
                      bar: "bg-blue-500",
                    },
                    {
                      label: "Bounce Rate",
                      value: "45%",
                      pct: 45,
                      bar: "bg-orange-500",
                    },
                    {
                      label: "Page Views",
                      value: "8.7k",
                      pct: 87,
                      bar: "bg-green-500",
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {row.label}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {row.value}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-2 rounded-full ${row.bar}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Top Products
                </h3>
                <div className="space-y-3">
                  {TOP_PRODUCTS.map((product) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {product.name}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {product.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
