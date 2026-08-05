"use client";

import KineticGrid from "@/components/ui/kinetic-grid";
import { BellNotify } from "@/components/ui/bell-notify";
import { useAccentColor } from "@/components/accent-provider";

export default function Home() {
  const { color } = useAccentColor();

  // KineticGrid fills whatever height the header leaves; px-8 on mobile clears
  // the rotated copyright strip pinned to the left edge.
  return (
    <KineticGrid accentColor={color} className="min-h-0 flex-1">
      <div className="flex h-full flex-col items-center justify-center px-8 py-4 text-center">
        <h1 className="max-w-5xl text-2xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-[340px]:text-lg! [@media(min-height:461px)_and_(max-height:620px)]:text-xl! [@media(max-height:460px)]:text-base!">
          We are always here to Grow your Business with our Expert Team!
        </h1>

        {/* The bell scales with font-size and its CTA hangs ~8em below the
            artwork, so both the box and the font-size step down together —
            including a height-based step for very short viewports, where the
            CTA would otherwise be pushed past the bottom edge. */}
        <div className="pointer-events-none mt-4 h-[210px] w-full sm:mt-6 sm:h-[260px] lg:mt-8 lg:h-[320px] max-[340px]:h-[160px]! [@media(min-height:461px)_and_(max-height:620px)]:mt-2! [@media(min-height:461px)_and_(max-height:620px)]:h-[150px]! [@media(max-height:460px)]:mt-2! [@media(max-height:460px)]:h-[105px]!">
          <div className="pointer-events-auto h-full w-full">
            <BellNotify
              size={300}
              buttonLabel="Get a Call Within 5 Minutes"
              className="[font-size:1.7px]! sm:[font-size:2.1px]! lg:[font-size:2.6px]! max-[340px]:[font-size:1.3px]! [@media(min-height:461px)_and_(max-height:620px)]:[font-size:1.2px]! [@media(max-height:460px)]:[font-size:0.8px]!"
            />
          </div>
        </div>
      </div>
    </KineticGrid>
  );
}
