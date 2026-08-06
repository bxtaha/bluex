import localFont from "next/font/local";

// Self-hosted from public/fonts rather than linked from the Fontshare CDN:
// one less external round-trip on a site whose pitch is that it feels fast.

export const clashDisplay = localFont({
  src: [
    { path: "../public/fonts/clash-display-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/clash-display-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/clash-display-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/clash-display-700.woff2", weight: "700", style: "normal" },
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
