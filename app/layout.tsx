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
      <body className="min-h-full flex flex-col">
        <AccentColorProvider>
          <div className="fixed inset-x-0 top-0 z-50 flex flex-col">
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
