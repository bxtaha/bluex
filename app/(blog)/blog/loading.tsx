/**
 * Shown while the blog's server work runs.
 *
 * The index is not a static page: it reads `searchParams` for the page number
 * and the category filter, then awaits three parallel queries — the page of
 * posts, the category list and the featured post. Every filter click and every
 * page step is therefore a server round trip, and those are the navigations a
 * reader makes most on this route.
 *
 * `min-h-[60vh]` rather than `min-h-screen`: the layout's header and footer
 * stay mounted through the transition and only `<main>` is replaced, so a
 * full-screen box here would shove the footer down and then yank it back. The
 * height is roughly what a page of cards occupies, which keeps the footer
 * approximately still.
 *
 * Post pages under this segment are statically generated, so this will hardly
 * ever be seen there — which is the correct outcome, not a reason to move the
 * file deeper.
 */
export default function BlogLoading() {
  return (
    <div
      role="status"
      className="flex min-h-[60vh] items-center justify-center px-6"
    >
      <span className="flex items-center gap-3 text-sm text-ink-muted">
        <span className="bx-spinner text-electric-glow" aria-hidden />
        Loading posts…
      </span>
    </div>
  );
}
