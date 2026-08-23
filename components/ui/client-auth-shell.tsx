import Link from "next/link";

/**
 * The frame around the portal's unauthenticated pages.
 *
 * Shared by sign-in and password setup so the two read as one product rather
 * than two forms that happen to be adjacent. Brand-side rather than admin-side:
 * these are customers, and the palette is the marketing site's — `--color-void`,
 * `--color-electric` — not the gray/blue Tailwind scale the staff dashboard uses.
 * A client arriving from a link in an email should recognise where they are.
 *
 * Centring is done with min-h-dvh rather than min-h-screen. On mobile Safari
 * `100vh` is the height the viewport *would* have with the URL bar retracted, so
 * a centred card sits low and its lower edge hides behind the browser chrome —
 * on a sign-in form that is the submit button.
 */
export function ClientAuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[26rem]">
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-electric/60"
            aria-label="BlueX home"
          >
            <span className="grid size-10 place-content-center rounded-xl bg-electric">
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
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight text-ink">
              BlueX
            </span>
          </Link>

          <h1 className="mt-7 font-heading text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {subtitle}
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-20px_rgba(0,0,0,0.8)] sm:p-7">
          {children}
        </div>

        {footer ? (
          <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
