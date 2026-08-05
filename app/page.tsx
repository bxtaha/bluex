"use client";

import KineticGrid from "@/components/ui/kinetic-grid";
import { BellNotify } from "@/components/ui/bell-notify";
import { useAccentColor } from "@/components/accent-provider";

export default function Home() {
  const { color } = useAccentColor();

  return (
    <KineticGrid accentColor={color}>
      {/* pt clears the fixed Navbar + TopBar stack, which is out of flow and
          would otherwise sit on top of the heading */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 pt-44 text-center sm:pt-40">
        <h1 className="max-w-5xl text-4xl font-semibold tracking-tight text-white sm:text-7xl lg:text-8xl">
          We are always here to Grow your Business with our Expert Team!
        </h1>

        <div className="pointer-events-none mt-12 h-[420px] w-full">
          <div className="pointer-events-auto h-full w-full">
            <BellNotify
              size={300}
              buttonLabel="Get a Call Within 5 Minutes"
            />
          </div>
        </div>
      </div>
    </KineticGrid>
  );
}
