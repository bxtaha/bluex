"use client";

import { useEffect, useRef } from "react";
import { ChevronsRight, X } from "lucide-react";

export type NavItem = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Rendered as a count when present. Pass undefined, not 0, for "nothing". */
  badge?: number;
  /** Runs instead of selecting — for actions like signing out. */
  onSelect?: () => void;
};

export type NavGroup = {
  /** Absent for the first group, which needs no heading above the first item. */
  label?: string;
  items: NavItem[];
};

/**
 * The admin sidebar, at two sizes.
 *
 * Previously one fixed 256px column with no mobile treatment at all: on a 390px
 * phone it took two thirds of the width and the content beside it was unusable.
 * The dashboard is checked between calls as often as at a desk, so that was the
 * largest single usability problem in here.
 *
 * Now the same nav renders two ways from one definition. Below `lg` it is an
 * off-canvas drawer over a backdrop; at `lg` and up it is the column, still
 * collapsible to icons. One `NavGroup[]` feeds both, because two lists would
 * drift the first time an item was added to one of them.
 */
export function AdminSidebar({
  groups,
  selected,
  onSelect,
  open,
  setOpen,
  drawerOpen,
  setDrawerOpen,
  header,
}: {
  groups: NavGroup[];
  selected: string;
  onSelect: (title: string) => void;
  /** Desktop: expanded or icons-only. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Mobile: drawer showing. */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  header: React.ReactNode;
}) {
  const drawer = useRef<HTMLElement>(null);

  // Escape closes the drawer, matching the dialog. A panel that covers the
  // screen and can only be dismissed by finding its close button is a trap on a
  // keyboard.
  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, setDrawerOpen]);

  // The body does not scroll behind an open drawer. Without this, a scroll
  // gesture on the backdrop moves the page underneath, which reads as the drawer
  // itself sliding.
  useEffect(() => {
    if (!drawerOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) drawer.current?.focus();
  }, [drawerOpen]);

  function select(item: NavItem) {
    if (item.onSelect) item.onSelect();
    else onSelect(item.title);

    // Picking a destination closes the drawer. Leaving it open hides the thing
    // the person just asked to see.
    setDrawerOpen(false);
  }

  const nav = (expanded: boolean) => (
    <>
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`}>
          {group.label ? (
            <GroupLabel label={group.label} expanded={expanded} />
          ) : null}

          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavButton
                key={item.title}
                item={item}
                expanded={expanded}
                current={selected === item.title}
                onClick={() => select(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* ── Mobile drawer ── */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          drawerOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-gray-950/60 transition-opacity duration-200 motion-reduce:transition-none ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          ref={drawer}
          // `inert` is typed `boolean` in React 19, not the empty string older
          // examples use. Set when closed so the off-screen panel's buttons are
          // not reachable by Tab while it is invisible.
          inert={!drawerOpen}
          tabIndex={-1}
          aria-label="Dashboard sections"
          className={`absolute inset-y-0 left-0 flex w-[17.5rem] max-w-[85vw] flex-col border-r border-gray-200 bg-white outline-none transition-transform duration-200 ease-out motion-reduce:transition-none dark:border-gray-800 dark:bg-gray-900 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-gray-200 p-3 dark:border-gray-800">
            <div className="min-w-0 flex-1">{header}</div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="grid size-9 shrink-0 place-content-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 motion-reduce:transition-none dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* Both axes stated. `overflow-y: auto` alone computes `overflow-x` to
              `auto` and grew a phantom horizontal scrollbar in the nav panel —
              15px of offsetHeight on desktop, 0 under mobile emulation. */}
          <div className="flex-1 space-y-1 overflow-hidden overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {nav(true)}
          </div>
        </aside>
      </div>

      {/* ── Desktop column ── */}
      <nav
        aria-label="Dashboard sections"
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex dark:border-gray-800 dark:bg-gray-900 ${
          open ? "w-64" : "w-[4.25rem]"
        }`}
      >
        <div className="border-b border-gray-200 p-3 dark:border-gray-800">
          {open ? header : <div className="flex justify-center">{header}</div>}
        </div>

        <div className="flex-1 space-y-1 overflow-hidden overflow-y-auto p-2">
          {nav(open)}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="flex h-11 shrink-0 items-center gap-3 border-t border-gray-200 px-3 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 motion-reduce:transition-none dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <ChevronsRight
            className={`size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
              open ? "rotate-180" : "mx-auto"
            }`}
            aria-hidden
          />
          {open ? <span className="text-[0.8125rem] font-medium">Collapse</span> : null}
        </button>
      </nav>
    </>
  );
}

/**
 * A heading between groups.
 *
 * Collapsed there is no room for the words, so it becomes a rule — the grouping
 * is the useful part and it survives at 68px wide. `aria-hidden` either way:
 * this labels a visual cluster over a flat list of buttons, and announcing a
 * heading that groups nothing programmatically is worse than silence.
 */
function GroupLabel({
  label,
  expanded,
}: {
  label: string;
  expanded: boolean;
}) {
  if (!expanded) {
    return (
      <div
        aria-hidden
        className="mx-2.5 mb-1.5 mt-3 border-t border-gray-200 dark:border-gray-800"
      />
    );
  }

  return (
    <div
      aria-hidden
      className="mb-1.5 mt-4 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
    >
      {label}
    </div>
  );
}

function NavButton({
  item,
  expanded,
  current,
  onClick,
}: {
  item: NavItem;
  expanded: boolean;
  current: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      title={expanded ? undefined : item.title}
      aria-current={current ? "page" : undefined}
      className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric motion-reduce:transition-none ${
        current
          ? "bg-electric/10 text-electric dark:bg-electric/15 dark:text-electric-glow"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      }`}
    >
      <span className="grid size-5 shrink-0 place-content-center">
        <Icon className="size-4" />
      </span>

      {expanded ? (
        <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
      ) : null}

      {/* `!= null` rather than truthy: `badge={0}` is a real value and a bare
          `&&` renders the digit 0 into the markup. Callers pass undefined for
          "nothing waiting", because a badge reading 0 is a notification that
          there are no notifications. */}
      {item.badge != null ? (
        expanded ? (
          <span className="ml-auto min-w-5 rounded-md bg-electric px-1.5 text-center text-[0.6875rem] font-semibold leading-5 tabular-nums text-white">
            {item.badge}
          </span>
        ) : (
          // Collapsed, there is no room for a number, so it becomes a dot. The
          // count is lost; the fact that something is waiting is not, and that
          // is the part that makes anyone open the sidebar.
          <span
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-electric ring-2 ring-white dark:ring-gray-900"
            aria-hidden
          />
        )
      ) : null}
    </button>
  );
}
