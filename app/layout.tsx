import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { TopBar } from "@/components/topbar";
import { Copyright } from "@/components/copyright";
import StarOnGithub from "@/components/ui/button-github";
import { AccentColorProvider } from "@/components/accent-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlueX",
  description: "We are here to grow your Business with our Expert Team!",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* h-dvh + flex column: the header takes its natural height and the page
          content fills exactly the rest, so the two can never overlap and the
          viewport is filled without scrolling on any device. dvh (not vh)
          tracks mobile browser chrome as it collapses. */}
      <body className="flex h-dvh flex-col bg-[#161618]">
        <AccentColorProvider>
          <div id="site-header" className="relative z-50 flex shrink-0 flex-col">
            <Navbar />
            <TopBar />
          </div>
          {children}
          <Copyright />
          <div className="fixed bottom-6 left-6 z-50">
            <StarOnGithub />
          </div>
        </AccentColorProvider>
      </body>
    </html>
  );
}
