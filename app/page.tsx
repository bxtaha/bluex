"use client";

import KineticGrid from "@/components/ui/kinetic-grid";
import { BellNotify } from "@/components/ui/bell-notify";
import { useAccentColor } from "@/components/accent-provider";

export default function Home() {
  const { color } = useAccentColor();

  return (
    <KineticGrid accentColor={color}>
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl font-semibold tracking-t font-semibold tracking-tight text-white sm:text-6xl">
          We are always here to Grow your Business with our Expert Team!
        </h1>

        <div className="pointer-events-none mt-12 h-[420px] w-full">
          <div className="pointer-events-auto h-full w-full">
            <BellNotify size={300} buttonLabel="Notify Me" />
          </div>
        </div>
      </div>
    </KineticGrid>
  );
}
