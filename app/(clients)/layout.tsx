import type { Metadata } from "next";

/**
 * The client portal shell.
 *
 * `noindex, nofollow` is the whole reason this layout exists as a route group of
 * its own. Everything under `/clients` is either a sign-in form or an
 * authenticated page, and neither belongs in a search result: an indexed login
 * page is a permanent invitation to credential-stuffing traffic, and the setup
 * route carries a token in its query string that must never reach a crawler's
 * logs or a cached SERP snippet.
 *
 * `nofollow` as well as `noindex`, matching the admin area — a crawler that
 * reaches the login page should not then walk into the rest of it.
 *
 * The root layout already supplies `<html>`, `<body>`, the fonts and the
 * near-black background, so there is deliberately almost nothing here. Unlike
 * the marketing site there is no Lenis, no GSAP and no cursor: a form does not
 * want smooth-scroll hijacking, and a portal that animates while someone is
 * trying to sign in is a portal that feels slow.
 */
export const metadata: Metadata = {
  title: "Client portal — BlueX",
  robots: { index: false, follow: false },
};

export default function ClientsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-void text-ink">{children}</div>;
}
