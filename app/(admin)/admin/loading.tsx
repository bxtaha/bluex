/**
 * Shown while the dashboard's server work runs.
 *
 * This is the slowest route in the app and by some distance: the page awaits
 * nine parallel reads — tiers, contact, unread, attention, posts, projects,
 * footnote, client counts — plus `isConfigured()`, which since the voice
 * settings moved into the database is itself a Mongo round trip. Until this
 * file existed, clicking into `/admin` showed the previous page, unchanged,
 * for the whole of that.
 *
 * It also covers `/admin/login`, which is fast enough that this barely
 * flashes there. That is the right trade: a segment-level `loading.tsx` is
 * one file for the whole area, and a spinner that appears for 40ms is
 * invisible while a missing one is not.
 *
 * Deliberately not a skeleton of the dashboard. What renders depends on what
 * is actually waiting — an empty queue looks completely different from three
 * rows — so a skeleton would be guessing at a shape it cannot know, and
 * guessing wrong reads worse than an honest spinner.
 *
 * Server component: no interactivity, so nothing here needs to ship to the
 * browser.
 */
export default function AdminLoading() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950"
    >
      <span className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="bx-spinner text-electric" aria-hidden />
        Loading the dashboard…
      </span>
    </div>
  );
}
