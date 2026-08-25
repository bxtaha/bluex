/**
 * Shown while the client portal resolves who is asking.
 *
 * `currentClient()` is a session lookup that re-checks the client's status on
 * every request rather than trusting the cookie — see `getClientSessionUser` —
 * so this is a real database round trip before anything can render, and it
 * gates a redirect. Without this the portal shows the previous page while it
 * decides whether to let you in.
 *
 * Matches the portal's own skin (`bg-void`, set in the route group's layout)
 * rather than the admin's light chrome: these are two different applications
 * and a loading state that flashes the wrong palette is a flash of the wrong
 * product.
 */
export default function ClientsLoading() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center bg-void text-ink"
    >
      <span className="flex items-center gap-3 text-sm text-ink-muted">
        <span className="bx-spinner text-electric-glow" aria-hidden />
        Signing you in…
      </span>
    </div>
  );
}
