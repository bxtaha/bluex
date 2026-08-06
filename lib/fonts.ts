import localFont from "next/font/local";

// Self-hosted from public/fonts rather than linked from the Fontshare CDN:
// one less external round-trip on a site whose pitch is that it feels fast.

// One weight, because one weight is used. `.bx-display` is the only rule that
// reaches for this family and it asks for 600; 400, 500 and 700 were being
// preloaded on every visit and never requested — 45KB of the critical path
// spent on faces nothing draws. The files are still in public/fonts if a
// heading ever wants another weight.
export const clashDisplay = localFont({
  src: [
    { path: "../public/fonts/clash-display-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-clash-display",
  display: "swap",
  preload: true,
});

export const generalSans = localFont({
  src: [
    { path: "../public/fonts/general-sans-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/general-sans-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/general-sans-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-general-sans",
  display: "swap",
  preload: true,
});
