import type { NextConfig } from "next";

/**
 * The host the canonical tag names, without the scheme.
 *
 * Derived from `NEXT_PUBLIC_SITE_URL` rather than hard-coded so a preview
 * deployment does not 301 its own visitors at production. `lib/site.ts` reads
 * the same variable for the canonical link, the sitemap and Open Graph — the
 * redirect below and the canonical tag agreeing is the entire point of it.
 */
const CANONICAL_HOST = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bluex.agency",
).host;

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on scripts and styles is deliberate, not an oversight. The
 * strict alternative is a per-request nonce, which has to come from middleware,
 * and a nonce makes every response dynamic — the home page is prerendered with
 * `revalidate = 60`, so switching it to per-request rendering would trade a
 * 275ms TTFB for a database round trip on every visit. That is a worse deal
 * than the one this policy declines: the page has no user-generated script and
 * no third-party script at all, so the injection surface a nonce would close is
 * already empty.
 *
 * `img-src` is wide because it has to be. Project cards, blog covers and the
 * admin's uploads are all admin-supplied absolute URLs rendered through a plain
 * `<img>`, and the host is whatever was pasted in.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Six headers, one grade. All of them were missing.
 *
 * HSTS is the one with a ranking story attached; the rest are baseline
 * hardening. Two years with `preload` is the submission threshold for the
 * browser preload list — shorter values are accepted by browsers but rejected
 * by hstspreload.org, so a one-year value is the worst of both worlds.
 *
 * `Permissions-Policy` denies the three capabilities this site has no use for.
 * The voice agent talks to ElevenLabs from the server; nothing in the browser
 * ever asks for a microphone, and a policy that says so is a promise a future
 * dependency cannot quietly break.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",

  /**
   * `x-powered-by: Next.js` on every response tells anyone probing the site
   * exactly what to look up advisories for and tells visitors nothing.
   */
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  /**
   * Both hosts served a live 200 and neither pointed at the other, so search
   * engines were free to index two copies of the site and split the backlinks
   * between them.
   *
   * `statusCode: 301` rather than `permanent: true`, which is not the same
   * thing however much it reads like it: `permanent` emits a **308**. Both are
   * permanent and Google follows both, but 308 exists to preserve the request
   * method across a redirect, which is a guarantee nothing here needs — every
   * request to this host is a GET — and it is the one of the two that older
   * crawlers and SEO tools may not recognise. Verified with `curl -I`, because
   * the first version of this shipped a 308 while its comment claimed a 301.
   *
   * This belongs at the CDN too, and the CDN is the better place for it: a
   * redirect served from the edge never wakes the origin. Keeping it here as
   * well costs one string comparison per request and means the guarantee
   * survives a move to different hosting.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${CANONICAL_HOST}` }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        statusCode: 301,
      },
    ];
  },

  /**
   * Left as real `require`s at runtime instead of being bundled.
   *
   * All three reach for Node internals the bundler cannot see through —
   * `imapflow` opens TLS sockets and loads its own protocol handlers,
   * `mailparser` pulls in optional character-set decoders by name, and
   * `nodemailer` resolves transports the same way. Bundling them either fails
   * at build time or, worse, succeeds and then cannot find a module for a
   * charset that only some real email uses.
   */
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer"],
};

export default nextConfig;
