import type { Metadata } from "next";
import { clashDisplay, generalSans } from "@/lib/fonts";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { LeadFormProvider } from "@/components/providers/lead-form-provider";
import { CustomCursor } from "@/components/ui/custom-cursor";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { BackToTop } from "@/components/ui/back-to-top";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlueX — Every lead called back in five minutes",
  description:
    "A web and AI-automation studio. We build the websites that bring you leads and the AI voice agents that call them within five minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${clashDisplay.variable} ${generalSans.variable} antialiased`}
    >
      <body className="bg-void text-ink">
        {/* Fixed gradient wash + grain behind every section, so the near-black
            never reads as flat. */}
        <div className="bx-atmosphere" aria-hidden />

        <SmoothScroll />
        <CustomCursor />

        <LeadFormProvider>
          <SiteHeader />
          <main className="relative z-10">{children}</main>
        </LeadFormProvider>

        {/* Fixed overlays, so they add nothing to layout and cannot shift
            content. Outside <main> because neither is page content. */}
        <ScrollProgress />
        <BackToTop />
      </body>
    </html>
  );
}
